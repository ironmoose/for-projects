import type { Project } from "../entities";
import type { CreateProjectInput, UpdateProjectInput } from "../inputs";
import type { IProjectService, Paginated, ProjectFilter } from "../services";
import { ServiceError } from "../errors";
import type { ProjectRepository } from "../repositories/projects";
import { PROJECT_STATUSES } from "../enums";
import type { EventBus } from "../events";

export class ProjectService implements IProjectService {
  constructor(private repo: ProjectRepository, private eventBus?: EventBus) {}

  findAll(limit = 50, offset = 0, filter?: ProjectFilter): Paginated<Project> {
    return {
      data: this.repo.findAll(limit, offset, filter),
      total: this.repo.count(filter),
    };
  }

  findById(id: string): Project | null {
    return this.repo.findById(id);
  }

  create(input: CreateProjectInput): Project {
    if (!input.name?.trim()) {
      throw new ServiceError("name is required", 400);
    }
    if (input.name.length > 255) {
      throw new ServiceError("name must be 255 characters or fewer", 400);
    }
    if (input.description !== undefined && input.description.length > 10000) {
      throw new ServiceError("description must be 10000 characters or fewer", 400);
    }
    if (input.status !== undefined && !(PROJECT_STATUSES as readonly string[]).includes(input.status)) {
      throw new ServiceError(`status must be one of: ${PROJECT_STATUSES.join(", ")}`, 400);
    }
    const project = this.repo.create(input);
    this.eventBus?.emit({ entity: "project", action: "created", payload: project });
    return project;
  }

  update(id: string, input: UpdateProjectInput): Project | null {
    if (input.name !== undefined && !input.name.trim()) {
      throw new ServiceError("name cannot be empty", 400);
    }
    if (input.name !== undefined && input.name.length > 255) {
      throw new ServiceError("name must be 255 characters or fewer", 400);
    }
    if (input.description !== undefined && input.description.length > 10000) {
      throw new ServiceError("description must be 10000 characters or fewer", 400);
    }
    if (input.status !== undefined && !(PROJECT_STATUSES as readonly string[]).includes(input.status)) {
      throw new ServiceError(`status must be one of: ${PROJECT_STATUSES.join(", ")}`, 400);
    }
    const project = this.repo.update(id, input);
    if (project) {
      this.eventBus?.emit({ entity: "project", action: "updated", payload: project });
    }
    return project;
  }

  delete(id: string): boolean {
    const project = this.repo.findById(id);
    const deleted = this.repo.delete(id);
    if (deleted && project) {
      this.eventBus?.emit({ entity: "project", action: "deleted", payload: { id: project.id } });
    }
    return deleted;
  }
}
