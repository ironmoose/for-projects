import type { Task } from "../entities";
import type { CreateTaskInput, UpdateTaskInput } from "../inputs";
import type { ITaskService, IActionService, IEntityActionService, Paginated, TaskFilter } from "../services";
import { ServiceError } from "../errors";
import type { TaskRepository } from "../repositories/tasks";
import type { ProjectRepository } from "../repositories/projects";
import type { EventBus } from "../events";
import { TASK_ACTION_TEMPLATES } from "../action-templates";

const VALID_STATUSES = ["todo", "in_progress", "done"] as const;

export class TaskService implements ITaskService {
  constructor(
    private taskRepo: TaskRepository,
    private projectRepo: ProjectRepository,
    private eventBus?: EventBus,
    private actionService?: IActionService,
    private entityActionService?: IEntityActionService,
  ) {}

  findById(id: string): Task | null {
    return this.taskRepo.findById(id);
  }

  findByProjectId(projectId: string, limit = 100, offset = 0, filter?: TaskFilter): Paginated<Task> {
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new ServiceError("project not found", 404);
    }
    return {
      data: this.taskRepo.findByProject(project.id, limit, offset, filter?.status),
      total: this.taskRepo.countByProject(project.id, filter?.status),
    };
  }

  create(input: CreateTaskInput): Task {
    const project = this.projectRepo.findById(input.project_id);
    if (!project) {
      throw new ServiceError("project not found", 404);
    }
    if (!input.summary?.trim()) {
      throw new ServiceError("summary is required", 400);
    }
    if (input.summary.length > 500) {
      throw new ServiceError("summary must be 500 characters or fewer", 400);
    }
    if (input.context !== undefined && input.context.length > 10000) {
      throw new ServiceError("context must be 10000 characters or fewer", 400);
    }
    if (input.status !== undefined && !VALID_STATUSES.includes(input.status as typeof VALID_STATUSES[number])) {
      throw new ServiceError(`status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }
    const task = this.taskRepo.create(input);
    this.eventBus?.emit({ entity: "task", action: "created", payload: task });

    if (this.actionService && this.entityActionService) {
      for (const template of TASK_ACTION_TEMPLATES) {
        const action = this.actionService.create({ name: template.name, prompt: template.prompt, agent: template.agent });
        this.entityActionService.link({
          entity_type: "task",
          entity_id: task.id,
          role: template.role,
          action_id: action.id,
        });
      }
    }

    return task;
  }

  update(id: string, input: UpdateTaskInput): Task | null {
    if (input.summary !== undefined && !input.summary.trim()) {
      throw new ServiceError("summary cannot be empty", 400);
    }
    if (input.summary !== undefined && input.summary.length > 500) {
      throw new ServiceError("summary must be 500 characters or fewer", 400);
    }
    if (input.context !== undefined && input.context.length > 10000) {
      throw new ServiceError("context must be 10000 characters or fewer", 400);
    }
    if (input.status !== undefined && !VALID_STATUSES.includes(input.status as typeof VALID_STATUSES[number])) {
      throw new ServiceError(`status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }
    const task = this.taskRepo.update(id, input);
    if (task) {
      this.eventBus?.emit({ entity: "task", action: "updated", payload: task });
    }
    return task;
  }
}
