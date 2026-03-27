import type { Task } from "../entities";
import type { CreateTaskInput, UpdateTaskInput } from "../inputs";
import type { ITaskService, Paginated, TaskFilter } from "../services";
import { ServiceError } from "../errors";
import type { TaskRepository } from "../repositories/tasks";
import type { ProjectRepository } from "../repositories/projects";
import { TASK_STATUSES, TASK_TYPES, TASK_EFFORTS } from "../enums";
import type { EventBus } from "../events";

export class TaskService implements ITaskService {
  constructor(
    private taskRepo: TaskRepository,
    private projectRepo: ProjectRepository,
    private eventBus?: EventBus,
  ) {}

  findByProjectId(projectId: string, limit = 100, offset = 0, filter?: TaskFilter): Paginated<Task> {
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new ServiceError("project not found", 404);
    }
    return {
      data: this.taskRepo.findByProject(project.id, limit, offset, filter),
      total: this.taskRepo.countByProject(project.id, filter),
    };
  }

  findByNumber(projectId: string, number: number): Task | null {
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new ServiceError("project not found", 404);
    }
    return this.taskRepo.findByNumber(project.id, number);
  }

  create(projectId: string, input: CreateTaskInput): Task {
    const project = this.projectRepo.findById(projectId);
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
    if (input.type !== undefined && input.type !== null && !(TASK_TYPES as readonly string[]).includes(input.type)) {
      throw new ServiceError(`type must be one of: ${TASK_TYPES.join(", ")}`, 400);
    }
    if (input.effort !== undefined && input.effort !== null && !(TASK_EFFORTS as readonly string[]).includes(input.effort)) {
      throw new ServiceError(`effort must be one of: ${TASK_EFFORTS.join(", ")}`, 400);
    }
    if (input.priority !== undefined && input.priority !== null) {
      if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 10) {
        throw new ServiceError("priority must be an integer between 1 and 10", 400);
      }
    }
    const task = this.taskRepo.create(project.id, input);
    this.eventBus?.emit({ entity: "task", action: "created", payload: task });
    return task;
  }

  update(projectId: string, id: string, input: UpdateTaskInput): Task | null {
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new ServiceError("project not found", 404);
    }
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
    if (input.type !== undefined && input.type !== null && !(TASK_TYPES as readonly string[]).includes(input.type)) {
      throw new ServiceError(`type must be one of: ${TASK_TYPES.join(", ")}`, 400);
    }
    if (input.effort !== undefined && input.effort !== null && !(TASK_EFFORTS as readonly string[]).includes(input.effort)) {
      throw new ServiceError(`effort must be one of: ${TASK_EFFORTS.join(", ")}`, 400);
    }
    if (input.priority !== undefined && input.priority !== null) {
      if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 10) {
        throw new ServiceError("priority must be an integer between 1 and 10", 400);
      }
    }
    const task = this.taskRepo.update(id, project.id, input);
    if (task) {
      this.eventBus?.emit({ entity: "task", action: "updated", payload: task });
    }
    return task;
  }

  delete(projectId: string, id: string): boolean {
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new ServiceError("project not found", 404);
    }
    const deleted = this.taskRepo.delete(id, project.id);
    if (deleted) {
      this.eventBus?.emit({ entity: "task", action: "deleted", payload: { id } });
    }
    return deleted;
  }
}
