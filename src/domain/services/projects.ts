import type { Project } from "../entities";
import type { CreateProjectInput, UpdateProjectInput } from "../inputs";
import type { IProjectService, Paginated, ProjectFilter } from "../services";
import { ServiceError } from "../errors";
import type { ProjectRepository } from "../repositories/projects";
import { PROJECT_STATUSES } from "../statuses";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ProjectService implements IProjectService {
  constructor(private repo: ProjectRepository) {}

  findAll(limit = 50, offset = 0, filter?: ProjectFilter): Paginated<Project> {
    return {
      data: this.repo.findAll(limit, offset, filter),
      total: this.repo.count(filter),
    };
  }

  findBySlug(slug: string): Project | null {
    return this.repo.findBySlug(slug);
  }

  create(input: CreateProjectInput): Project {
    if (!input.name?.trim()) {
      throw new ServiceError("name is required", 400);
    }
    if (input.name.length > 255) {
      throw new ServiceError("name must be 255 characters or fewer", 400);
    }
    if (!input.slug?.trim()) {
      throw new ServiceError("slug is required", 400);
    }
    if (input.slug.length > 100) {
      throw new ServiceError("slug must be 100 characters or fewer", 400);
    }
    if (!SLUG_RE.test(input.slug)) {
      throw new ServiceError("slug must be lowercase alphanumeric with hyphens only", 400);
    }
    if (input.description !== undefined && input.description.length > 10000) {
      throw new ServiceError("description must be 10000 characters or fewer", 400);
    }
    if (input.status !== undefined && !(PROJECT_STATUSES as readonly string[]).includes(input.status)) {
      throw new ServiceError(`status must be one of: ${PROJECT_STATUSES.join(", ")}`, 400);
    }
    if (this.repo.findBySlug(input.slug)) {
      throw new ServiceError("slug already exists", 409);
    }
    return this.repo.create(input);
  }

  update(slug: string, input: UpdateProjectInput): Project | null {
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
    return this.repo.update(slug, input);
  }

  delete(slug: string): boolean {
    return this.repo.delete(slug);
  }
}
