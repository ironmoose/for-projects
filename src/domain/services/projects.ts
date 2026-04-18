import { type Project, type ProjectSummary, type ProjectDocumentDetail } from "../entities";
import type { CreateProjectInput, UpdateProjectInput } from "../inputs";
import type { IProjectService, IProjectDocumentService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { IProjectRepository, IActivityLogRepository } from "../repositories/interfaces";
import type { EventBus } from "../events";

export class ProjectService implements IProjectService {
  constructor(
    private repo: IProjectRepository,
    private activityLog: IActivityLogRepository,
    private eventBus: EventBus,
    private projectDocService: IProjectDocumentService,
  ) {}

  async list(filter?: { id?: string; title?: string; limit?: number; offset?: number }): Promise<Paginated<ProjectSummary>> {
    return {
      data: await this.repo.findManySummary(filter),
      total: await this.repo.count(filter),
    };
  }

  async get(id: string): Promise<Project & { documents: ProjectDocumentDetail[] }> {
    const project = await this.repo.findById(id);
    if (!project) throw new ServiceError("project not found", 404);
    const documents = await this.projectDocService.findByProject(id);
    return { ...project, documents };
  }

  async create(inputs: CreateProjectInput[]): Promise<(Project & { documents: ProjectDocumentDetail[] })[]> {
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
      if (input.context !== undefined && input.context.length > 100_000) {
        throw new ServiceError("context must be 100,000 characters or fewer", 400);
      }
      if (input.requirements !== undefined && input.requirements.length > 100_000) {
        throw new ServiceError("requirements must be 100,000 characters or fewer", 400);
      }
      if (input.documents) {
        await this.projectDocService.validateMergePatch(input.documents);
      }
    }

    const rows = inputs.map((input) => ({
      title: input.title,
      summary: input.summary ?? null,
      context: input.context ?? null,
      requirements: input.requirements ?? null,
    }));

    const projects = await this.repo.insertMany(rows);

    for (let i = 0; i < projects.length; i++) {
      const input = inputs[i];
      if (input.documents) {
        await this.projectDocService.applyMergePatch(projects[i].id, input.documents);
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

    const results: (Project & { documents: ProjectDocumentDetail[] })[] = [];
    for (const p of projects) {
      results.push({ ...p, documents: await this.projectDocService.findByProject(p.id) });
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
      if (input.context !== undefined && input.context !== null && input.context.length > 100_000) {
        throw new ServiceError("context must be 100,000 characters or fewer", 400);
      }
      if (input.requirements !== undefined && input.requirements !== null && input.requirements.length > 100_000) {
        throw new ServiceError("requirements must be 100,000 characters or fewer", 400);
      }
      const existing = await this.repo.findById(input.id);
      if (!existing) throw new ServiceError(`project not found: ${input.id}`, 404);
    }

    const repoInputs = inputs.map(({ documents, ...rest }) => rest);
    const projects = await this.repo.updateMany(repoInputs);

    this.eventBus.beginBatch();
    try {
      for (const input of inputs) {
        if (input.documents) {
          await this.projectDocService.applyMergePatch(input.id, input.documents);
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
      await this.projectDocService.removeAllForProject(id);
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
