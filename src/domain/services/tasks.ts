import type { Task } from "../entities";
import type { CreateTaskInput, UpdateTaskInput } from "../inputs";
import type { ITaskService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { TaskRepository } from "../repositories/tasks";
import type { ProjectRepository } from "../repositories/projects";
import type { EventBus } from "../events";

export class TaskService implements ITaskService {
  constructor(
    private taskRepo: TaskRepository,
    private projectRepo: ProjectRepository,
    private eventBus: EventBus,
  ) {}

  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string }): Paginated<Task> {
    return {
      data: this.taskRepo.findMany(filter),
      total: this.taskRepo.count(filter),
    };
  }

  get(id: string): Task {
    const task = this.taskRepo.findById(id);
    if (!task) throw new ServiceError("task not found", 404);
    return task;
  }

  create(inputs: CreateTaskInput[]): Task[] {
    for (const input of inputs) {
      const project = this.projectRepo.findById(input.project_id);
      if (!project) {
        throw new ServiceError(`project not found: ${input.project_id}`, 404);
      }
      if (!input.title?.trim()) {
        throw new ServiceError("title is required", 400);
      }
      if (input.title.length > 255) {
        throw new ServiceError("title must be 255 characters or fewer", 400);
      }
      if (input.plan !== undefined && input.plan.length > 50000) {
        throw new ServiceError("plan must be 50000 characters or fewer", 400);
      }
    }

    const rows = inputs.map((input) => ({
      project_id: input.project_id,
      title: input.title,
      plan: input.plan ?? null,
    }));

    const tasks = this.taskRepo.insertMany(rows);
    this.eventBus.emit({ type: "created", entity_type: "task", payload: tasks });
    return tasks;
  }

  update(inputs: UpdateTaskInput[]): Task[] {
    for (const input of inputs) {
      if (input.title !== undefined && !input.title.trim()) {
        throw new ServiceError("title cannot be empty", 400);
      }
      if (input.title !== undefined && input.title.length > 255) {
        throw new ServiceError("title must be 255 characters or fewer", 400);
      }
      if (input.plan !== undefined && input.plan !== null && input.plan.length > 50000) {
        throw new ServiceError("plan must be 50000 characters or fewer", 400);
      }
      const existing = this.taskRepo.findById(input.id);
      if (!existing) throw new ServiceError(`task not found: ${input.id}`, 404);
    }

    const tasks = this.taskRepo.updateMany(inputs);
    this.eventBus.emit({ type: "updated", entity_type: "task", payload: tasks });
    return tasks;
  }

  remove(ids: string[]): void {
    this.taskRepo.deleteMany(ids);
    this.eventBus.emit({ type: "deleted", entity_type: "task", ids });
  }
}
