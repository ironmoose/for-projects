import type { Project } from "../entities";
import type { CreateProjectInput, UpdateProjectInput } from "../inputs";
import type { IProjectService, Paginated, ProjectFilter } from "../services";
import { ServiceError } from "../errors";
import type { ProjectRepository } from "../repositories/projects";
import type { EventBus } from "../events";

const VALID_STATUSES = ["active", "archived"] as const;

export class ProjectService implements IProjectService {
  constructor(private repo: ProjectRepository, private eventBus?: EventBus) {}

  findAll(limit = 50, offset = 0, filter?: ProjectFilter): Paginated<Project> {
    return {
      data: this.repo.findAll(limit, offset, filter?.status),
      total: this.repo.count(filter?.status),
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
    if (input.status !== undefined && !VALID_STATUSES.includes(input.status as typeof VALID_STATUSES[number])) {
      throw new ServiceError(`status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
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
    if (input.status !== undefined && !VALID_STATUSES.includes(input.status as typeof VALID_STATUSES[number])) {
      throw new ServiceError(`status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }
    const project = this.repo.update(id, input);
    if (project) {
      this.eventBus?.emit({ entity: "project", action: "updated", payload: project });
    }
    return project;
  }
}
