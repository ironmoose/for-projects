import { type Project, type ProjectSummary, type DocumentReferenceDetail, type DocumentReferenceSummary } from "../entities";
import type { CreateProjectInput, UpdateProjectInput } from "../inputs";
import type { IProjectService, IDocumentReferenceService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { IProjectRepository, IActivityLogRepository } from "../repositories/interfaces";
import type { EventBus } from "../events";

export class ProjectService implements IProjectService {
  constructor(
    private repo: IProjectRepository,
    private activityLog: IActivityLogRepository,
    private eventBus: EventBus,
    private docRefService: IDocumentReferenceService,
  ) {}

  async list(filter?: { id?: string; title?: string; limit?: number; offset?: number }): Promise<Paginated<ProjectSummary>> {
    return {
      data: await this.repo.findManySummary(filter),
      total: await this.repo.count(filter),
    };
  }

  async get(id: string): Promise<Project & { documents: DocumentReferenceDetail[] }> {
    const project = await this.repo.findById(id);
    if (!project) throw new ServiceError("project not found", 404);
    const documents = await this.docRefService.findByEntity("project", id);
    return { ...project, documents };
  }

  async create(inputs: CreateProjectInput[]): Promise<(Project & { documents: DocumentReferenceSummary[] })[]> {
    // Validate all inputs before any writes
    for (const input of inputs) {
      if (!input.title?.trim()) {
        throw new ServiceError("title is required", 400);
      }
      if (input.title.length > 255) {
        throw new ServiceError("title must be 255 characters or fewer", 400);
      }
      if (input.summary !== undefined && input.summary.length > 1000) {
        throw new ServiceError("summary must be 1000 characters or fewer", 400);
      }
      // Pre-validate document references so we fail before creating the entity
      if (input.documents) {
        await this.docRefService.validateMergePatch(input.documents);
      }
    }

    const rows = inputs.map((input) => ({
      title: input.title,
      summary: input.summary ?? null,
    }));

    const projects = await this.repo.insertMany(rows);

    // Create document references for each project
    for (let i = 0; i < projects.length; i++) {
      const input = inputs[i];
      if (input.documents) {
        await this.docRefService.applyMergePatch("project", projects[i].id, input.documents);
      }
    }

    for (const p of projects) {
      await this.activityLog.insert({
        entity_type: "project",
        entity_id: p.id,
        action: "created",
        summary: JSON.stringify({ title: p.title }),
      });
    }
    this.eventBus.emit({ type: "created", entity_type: "project", ids: projects.map((p) => p.id) });

    // Return projects with their document references
    const results: (Project & { documents: DocumentReferenceSummary[] })[] = [];
    for (const p of projects) {
      results.push({ ...p, documents: await this.docRefService.getReferencesForEntity("project", p.id) });
    }
    return results;
  }

  async update(inputs: UpdateProjectInput[]): Promise<Project[]> {
    for (const input of inputs) {
      if (input.title !== undefined && !input.title.trim()) {
        throw new ServiceError("title cannot be empty", 400);
      }
      if (input.title !== undefined && input.title.length > 255) {
        throw new ServiceError("title must be 255 characters or fewer", 400);
      }
      if (input.summary !== undefined && input.summary !== null && input.summary.length > 1000) {
        throw new ServiceError("summary must be 1000 characters or fewer", 400);
      }
      const existing = await this.repo.findById(input.id);
      if (!existing) throw new ServiceError(`project not found: ${input.id}`, 404);
    }

    // Strip documents from repo input
    const repoInputs = inputs.map(({ documents, ...rest }) => rest);
    const projects = await this.repo.updateMany(repoInputs);

    this.eventBus.beginBatch();
    try {
      // Process document references merge-patch
      for (const input of inputs) {
        if (input.documents) {
          await this.docRefService.applyMergePatch("project", input.id, input.documents);
        }
      }

      const inputById = new Map(inputs.map(i => [i.id, i]));
      for (const p of projects) {
        const input = inputById.get(p.id);
        const fields = Object.keys(input ?? {}).filter((k) => k !== "id" && k !== "documents");
        await this.activityLog.insert({
          entity_type: "project",
          entity_id: p.id,
          action: "updated",
          summary: JSON.stringify({ fields }),
        });
      }
      this.eventBus.emit({ type: "updated", entity_type: "project", ids: projects.map((p) => p.id) });

      return projects;
    } finally {
      this.eventBus.flushBatch();
    }
  }

  async remove(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.docRefService.removeAllForEntity("project", id);
    }
    await this.repo.deleteMany(ids);
    for (const id of ids) {
      await this.activityLog.insert({
        entity_type: "project",
        entity_id: id,
        action: "deleted",
        summary: JSON.stringify({}),
      });
    }
    this.eventBus.emit({ type: "deleted", entity_type: "project", ids });
  }
}
