import { type Project, toProjectSummary } from "../entities";
import type { CreateProjectInput, UpdateProjectInput } from "../inputs";
import type { IProjectService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { ProjectRepository } from "../repositories/projects";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";

export class ProjectService implements IProjectService {
  constructor(
    private repo: ProjectRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
  ) {}

  list(filter?: { id?: string; limit?: number; offset?: number }): Paginated<Project> {
    return {
      data: this.repo.findMany(filter).map(toProjectSummary),
      total: this.repo.count(filter),
    };
  }

  get(id: string): Project {
    const project = this.repo.findById(id);
    if (!project) throw new ServiceError("project not found", 404);
    return project;
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
    }

    const projects = this.repo.updateMany(inputs);
    for (const p of projects) {
      const fields = Object.keys(inputs.find((i) => i.id === p.id) ?? {}).filter((k) => k !== "id");
      this.activityLog.insert({
        entity_type: "project",
        entity_id: p.id,
        action: "updated",
        summary: JSON.stringify({ fields }),
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
