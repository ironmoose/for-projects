import type { Task } from "../entities";
import type { CreateTaskInput, UpdateTaskInput } from "../inputs";
import type { ITaskService, Paginated, TaskFilter } from "../services";
import { ServiceError } from "../errors";
import type { TaskRepository } from "../repositories/tasks";
import type { ProjectRepository } from "../repositories/projects";
import { TASK_STATUSES } from "../statuses";

export class TaskService implements ITaskService {
  constructor(
    private taskRepo: TaskRepository,
    private projectRepo: ProjectRepository
  ) {}

  findByProjectSlug(projectSlug: string, limit = 100, offset = 0, filter?: TaskFilter): Paginated<Task> {
    const project = this.projectRepo.findBySlug(projectSlug);
    if (!project) {
      throw new ServiceError("project not found", 404);
    }
    return {
      data: this.taskRepo.findByProject(project.id, limit, offset, filter),
      total: this.taskRepo.countByProject(project.id, filter),
    };
  }

  create(projectSlug: string, input: CreateTaskInput): Task {
    const project = this.projectRepo.findBySlug(projectSlug);
    if (!project) {
      throw new ServiceError("project not found", 404);
    }
    if (!input.title?.trim()) {
      throw new ServiceError("title is required", 400);
    }
    if (input.title.length > 500) {
      throw new ServiceError("title must be 500 characters or fewer", 400);
    }
    if (input.description !== undefined && input.description.length > 10000) {
      throw new ServiceError("description must be 10000 characters or fewer", 400);
    }
    if (input.status !== undefined && !(TASK_STATUSES as readonly string[]).includes(input.status)) {
      throw new ServiceError(`status must be one of: ${TASK_STATUSES.join(", ")}`, 400);
    }
    return this.taskRepo.create(project.id, input);
  }

  update(id: string, input: UpdateTaskInput): Task | null {
    if (input.title !== undefined && !input.title.trim()) {
      throw new ServiceError("title cannot be empty", 400);
    }
    if (input.title !== undefined && input.title.length > 500) {
      throw new ServiceError("title must be 500 characters or fewer", 400);
    }
    if (input.description !== undefined && input.description.length > 10000) {
      throw new ServiceError("description must be 10000 characters or fewer", 400);
    }
    if (input.status !== undefined && !(TASK_STATUSES as readonly string[]).includes(input.status)) {
      throw new ServiceError(`status must be one of: ${TASK_STATUSES.join(", ")}`, 400);
    }
    return this.taskRepo.update(id, input);
  }

  delete(id: string): boolean {
    return this.taskRepo.delete(id);
  }
}
