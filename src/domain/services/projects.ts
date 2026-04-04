import { type Project, type ProjectSummary, type DocumentReferenceSummary } from "../entities";
import type { CreateProjectInput, UpdateProjectInput } from "../inputs";
import type { IProjectService, IDocumentReferenceService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { ProjectRepository } from "../repositories/projects";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";

export class ProjectService implements IProjectService {
  constructor(
    private repo: ProjectRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
    private docRefService: IDocumentReferenceService,
  ) {}

  list(filter?: { id?: string; title?: string; limit?: number; offset?: number }): Paginated<ProjectSummary> {
    return {
      data: this.repo.findManySummary(filter),
      total: this.repo.count(filter),
    };
  }

  get(id: string): Project & { documents: DocumentReferenceSummary[] } {
    const project = this.repo.findById(id);
    if (!project) throw new ServiceError("project not found", 404);
    const documents = this.docRefService.getReferencesForEntity("project", id);
    return { ...project, documents };
  }

  create(inputs: CreateProjectInput[]): Project[] {
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
    }

    const rows = inputs.map((input) => ({
      title: input.title,
      summary: input.summary ?? null,
    }));

    const projects = this.repo.insertMany(rows);
    for (const p of projects) {
      this.activityLog.insert({
        entity_type: "project",
        entity_id: p.id,
        action: "created",
        summary: JSON.stringify({ title: p.title }),
      });
    }
    this.eventBus.emit({ type: "created", entity_type: "project", ids: projects.map((p) => p.id) });
    return projects;
  }

  update(inputs: UpdateProjectInput[]): Project[] {
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
      const existing = this.repo.findById(input.id);
      if (!existing) throw new ServiceError(`project not found: ${input.id}`, 404);
    }

    // Strip documents from repo input
    const repoInputs = inputs.map(({ documents, ...rest }) => rest);
    const projects = this.repo.updateMany(repoInputs);

    // Process document references merge-patch
    for (const input of inputs) {
      if (input.documents) {
        this.docRefService.applyMergePatch("project", input.id, input.documents);
      }
    }

    for (const p of projects) {
      const input = inputs.find((i) => i.id === p.id);
      const fields = Object.keys(input ?? {}).filter((k) => k !== "id" && k !== "documents");
      this.activityLog.insert({
        entity_type: "project",
        entity_id: p.id,
        action: "updated",
        summary: JSON.stringify({ fields }),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "project", ids: projects.map((p) => p.id) });
    return projects;
  }

  remove(ids: string[]): void {
    for (const id of ids) {
      this.docRefService.removeAllForEntity("project", id);
    }
    this.repo.deleteMany(ids);
    for (const id of ids) {
      this.activityLog.insert({
        entity_type: "project",
        entity_id: id,
        action: "deleted",
        summary: JSON.stringify({}),
      });
    }
    this.eventBus.emit({ type: "deleted", entity_type: "project", ids });
  }
}
