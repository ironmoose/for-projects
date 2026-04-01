import { type Task, toTaskSummary } from "../entities";
import type { CreateTaskInput, UpdateTaskInput } from "../inputs";
import type { ITaskService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { TaskRepository } from "../repositories/tasks";
import type { ProjectRepository } from "../repositories/projects";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";

export class TaskService implements ITaskService {
  constructor(
    private taskRepo: TaskRepository,
    private projectRepo: ProjectRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
  ) {}

  private static VALID_STATUSES = ["todo", "in_progress", "done", "archived"];
  private static VALID_EFFORTS = ["trivial", "low", "medium", "high", "extreme"];
  private static VALID_IMPACTS = ["trivial", "low", "medium", "high", "extreme"];
  private static VALID_CATEGORIES = ["feature", "bugfix", "refactor", "test", "perf", "infra", "docs", "security", "design", "chore"];

  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string; title?: string }): Paginated<Task> {
    return {
      data: this.taskRepo.findMany(filter).map(toTaskSummary),
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
      if (input.description !== undefined && input.description.length > 50000) {
        throw new ServiceError("description must be 50000 characters or fewer", 400);
      }
      if (input.implementation !== undefined && input.implementation.length > 50000) {
        throw new ServiceError("implementation must be 50000 characters or fewer", 400);
      }
      if (input.acceptance_criteria !== undefined && input.acceptance_criteria.length > 50000) {
        throw new ServiceError("acceptance_criteria must be 50000 characters or fewer", 400);
      }
      if (input.group_key !== undefined && input.group_key.length > 32) {
        throw new ServiceError("group_key must be 32 characters or fewer", 400);
      }
      if (input.status !== undefined && !TaskService.VALID_STATUSES.includes(input.status)) {
        throw new ServiceError(`status must be one of: ${TaskService.VALID_STATUSES.join(", ")}`, 400);
      }
      if (input.effort !== undefined && !TaskService.VALID_EFFORTS.includes(input.effort)) {
        throw new ServiceError(`effort must be one of: ${TaskService.VALID_EFFORTS.join(", ")}`, 400);
      }
      if (input.impact !== undefined && !TaskService.VALID_IMPACTS.includes(input.impact)) {
        throw new ServiceError(`impact must be one of: ${TaskService.VALID_IMPACTS.join(", ")}`, 400);
      }
      if (input.category !== undefined && !TaskService.VALID_CATEGORIES.includes(input.category)) {
        throw new ServiceError(`category must be one of: ${TaskService.VALID_CATEGORIES.join(", ")}`, 400);
      }
    }

    const rows = inputs.map((input) => ({
      project_id: input.project_id,
      title: input.title,
      plan: input.plan ?? null,
      description: input.description ?? null,
      implementation: input.implementation ?? null,
      acceptance_criteria: input.acceptance_criteria ?? null,
      group_key: input.group_key ?? null,
      status: input.status ?? "todo",
      effort: input.effort ?? null,
      impact: input.impact ?? null,
      category: input.category ?? null,
    }));

    const tasks = this.taskRepo.insertMany(rows);
    for (const t of tasks) {
      this.activityLog.insert({
        entity_type: "task",
        entity_id: t.id,
        action: "created",
        summary: JSON.stringify({ title: t.title, project_id: t.project_id }),
      });
    }
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
      if (input.description !== undefined && input.description !== null && input.description.length > 50000) {
        throw new ServiceError("description must be 50000 characters or fewer", 400);
      }
      if (input.implementation !== undefined && input.implementation !== null && input.implementation.length > 50000) {
        throw new ServiceError("implementation must be 50000 characters or fewer", 400);
      }
      if (input.acceptance_criteria !== undefined && input.acceptance_criteria !== null && input.acceptance_criteria.length > 50000) {
        throw new ServiceError("acceptance_criteria must be 50000 characters or fewer", 400);
      }
      if (input.group_key !== undefined && input.group_key !== null && input.group_key.length > 32) {
        throw new ServiceError("group_key must be 32 characters or fewer", 400);
      }
      if (input.status !== undefined && !TaskService.VALID_STATUSES.includes(input.status)) {
        throw new ServiceError(`status must be one of: ${TaskService.VALID_STATUSES.join(", ")}`, 400);
      }
      if (input.effort !== undefined && input.effort !== null && !TaskService.VALID_EFFORTS.includes(input.effort)) {
        throw new ServiceError(`effort must be one of: ${TaskService.VALID_EFFORTS.join(", ")}`, 400);
      }
      if (input.impact !== undefined && input.impact !== null && !TaskService.VALID_IMPACTS.includes(input.impact)) {
        throw new ServiceError(`impact must be one of: ${TaskService.VALID_IMPACTS.join(", ")}`, 400);
      }
      if (input.category !== undefined && input.category !== null && !TaskService.VALID_CATEGORIES.includes(input.category)) {
        throw new ServiceError(`category must be one of: ${TaskService.VALID_CATEGORIES.join(", ")}`, 400);
      }
      const existing = this.taskRepo.findById(input.id);
      if (!existing) throw new ServiceError(`task not found: ${input.id}`, 404);
    }

    const tasks = this.taskRepo.updateMany(inputs);
    for (const t of tasks) {
      const fields = Object.keys(inputs.find((i) => i.id === t.id) ?? {}).filter((k) => k !== "id");
      this.activityLog.insert({
        entity_type: "task",
        entity_id: t.id,
        action: "updated",
        summary: JSON.stringify({ fields }),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "task", payload: tasks });
    return tasks;
  }

  remove(ids: string[]): void {
    this.taskRepo.deleteMany(ids);
    for (const id of ids) {
      this.activityLog.insert({
        entity_type: "task",
        entity_id: id,
        action: "deleted",
        summary: JSON.stringify({}),
      });
    }
    this.eventBus.emit({ type: "deleted", entity_type: "task", ids });
  }
}
