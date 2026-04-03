import { type Project, type ProjectSummary, type DocumentSummary, toProjectSummary } from "../entities";
import type { CreateProjectInput, UpdateProjectInput } from "../inputs";
import type { IProjectService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { ProjectRepository } from "../repositories/projects";
import type { DocumentRepository } from "../repositories/documents";
import type { ProjectDocumentRepository } from "../repositories/project-documents";
import type { TagRepository } from "../repositories/tags";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";

export class ProjectService implements IProjectService {
  constructor(
    private repo: ProjectRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
    private documentRepo?: DocumentRepository,
    private projectDocumentRepo?: ProjectDocumentRepository,
    private tagRepo?: TagRepository,
  ) {}

  list(filter?: { id?: string; title?: string; limit?: number; offset?: number }): Paginated<ProjectSummary> {
    return {
      data: this.repo.findMany(filter).map(toProjectSummary),
      total: this.repo.count(filter),
    };
  }

  get(id: string): Project & { documents: DocumentSummary[] } {
    const project = this.repo.findById(id);
    if (!project) throw new ServiceError("project not found", 404);
    const rawDocs = this.projectDocumentRepo?.getDocumentsForProject(id) ?? [];
    const documents = rawDocs.map((doc) => {
      const tags = this.tagRepo?.getTagsForEntity("document", doc.id).map((t) => t.kind) ?? [];
      return { ...doc, tags };
    });
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
      if (input.goal !== undefined && input.goal.length > 50000) {
        throw new ServiceError("goal must be 50000 characters or fewer", 400);
      }
      if (input.requirements !== undefined && input.requirements.length > 50000) {
        throw new ServiceError("requirements must be 50000 characters or fewer", 400);
      }
      if (input.design !== undefined && input.design.length > 50000) {
        throw new ServiceError("design must be 50000 characters or fewer", 400);
      }
    }

    const rows = inputs.map((input) => ({
      title: input.title,
      goal: input.goal ?? null,
      requirements: input.requirements ?? null,
      design: input.design ?? null,
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
    this.eventBus.emit({ type: "created", entity_type: "project", payload: projects });
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
      if (input.goal !== undefined && input.goal !== null && input.goal.length > 50000) {
        throw new ServiceError("goal must be 50000 characters or fewer", 400);
      }
      if (input.requirements !== undefined && input.requirements !== null && input.requirements.length > 50000) {
        throw new ServiceError("requirements must be 50000 characters or fewer", 400);
      }
      if (input.design !== undefined && input.design !== null && input.design.length > 50000) {
        throw new ServiceError("design must be 50000 characters or fewer", 400);
      }
      const existing = this.repo.findById(input.id);
      if (!existing) throw new ServiceError(`project not found: ${input.id}`, 404);

      // Validate attach/detach documents
      if (input.attach_documents && input.detach_documents) {
        const overlap = input.attach_documents.filter((id) => input.detach_documents!.includes(id));
        if (overlap.length > 0) {
          throw new ServiceError("cannot attach and detach the same document", 400);
        }
      }
      if (input.attach_documents) {
        for (const docId of input.attach_documents) {
          const doc = this.documentRepo?.findById(docId);
          if (!doc) throw new ServiceError(`document not found: ${docId}`, 404);
        }
      }
      if (input.detach_documents) {
        for (const docId of input.detach_documents) {
          const doc = this.documentRepo?.findById(docId);
          if (!doc) throw new ServiceError(`document not found: ${docId}`, 404);
        }
      }
    }

    // Strip attach/detach from repo input
    const repoInputs = inputs.map(({ attach_documents, detach_documents, ...rest }) => rest);
    const projects = this.repo.updateMany(repoInputs);

    // Handle document link/unlink operations
    for (const input of inputs) {
      if (input.attach_documents && input.attach_documents.length > 0) {
        this.projectDocumentRepo?.linkDocuments(input.id, input.attach_documents);
      }
      if (input.detach_documents && input.detach_documents.length > 0) {
        this.projectDocumentRepo?.unlinkDocuments(input.id, input.detach_documents);
      }
    }

    for (const p of projects) {
      const input = inputs.find((i) => i.id === p.id);
      const fields = Object.keys(input ?? {}).filter((k) => k !== "id" && k !== "attach_documents" && k !== "detach_documents");
      const attached = input?.attach_documents?.length ?? 0;
      const detached = input?.detach_documents?.length ?? 0;
      const summaryObj: Record<string, unknown> = { fields };
      if (attached > 0) summaryObj.attached_documents = attached;
      if (detached > 0) summaryObj.detached_documents = detached;
      this.activityLog.insert({
        entity_type: "project",
        entity_id: p.id,
        action: "updated",
        summary: JSON.stringify(summaryObj),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "project", payload: projects });
    return projects;
  }

  remove(ids: string[]): void {
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
