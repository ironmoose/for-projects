import { type Task, type TaskSummary, TASK_STATUSES, EFFORT_LEVELS, IMPACT_LEVELS, TASK_CATEGORIES } from "../entities";
import type { CreateTaskInput, UpdateTaskInput } from "../inputs";
import type { ITaskService, ITaskDependencyService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { TaskRepository } from "../repositories/tasks";
import type { ProjectRepository } from "../repositories/projects";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";
import type { TaskDependencyRepository } from "../repositories/task-dependencies";

export class TaskService implements ITaskService {
  constructor(
    private taskRepo: TaskRepository,
    private projectRepo: ProjectRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
    private depRepo?: TaskDependencyRepository,
    private depService?: ITaskDependencyService,
  ) {}


  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string; title?: string; blocked?: boolean }): Paginated<TaskSummary> {
    const blockedFilter = filter?.blocked;
    // Strip blocked from the filter before passing to repo
    const repoFilter = filter ? { ...filter } : undefined;
    if (repoFilter) delete (repoFilter as Record<string, unknown>).blocked;

    const data = this.taskRepo.findManySummary(repoFilter);
    let total = this.taskRepo.count(repoFilter);

    // Compute is_blocked if we have the dependency repo
    if (this.depRepo && filter?.project_id) {
      const blockedIds = new Set(this.depRepo.getBlockedTaskIds(filter.project_id));
      const enriched = data.map((s) => ({ ...s, is_blocked: blockedIds.has(s.id) }));

      if (blockedFilter !== undefined) {
        const filtered = enriched.filter((s) => s.is_blocked === blockedFilter);
        return { data: filtered, total: filtered.length };
      }
      return { data: enriched, total };
    }

    // If no project_id, compute is_blocked per-task (grouped by project for efficiency)
    if (this.depRepo) {
      const blockedIdCache = new Map<string, Set<string>>();
      const enriched = data.map((s) => {
        const task = this.taskRepo.findById(s.id);
        if (!task) return { ...s, is_blocked: false };
        if (!blockedIdCache.has(task.project_id)) {
          blockedIdCache.set(task.project_id, new Set(this.depRepo!.getBlockedTaskIds(task.project_id)));
        }
        return { ...s, is_blocked: blockedIdCache.get(task.project_id)!.has(s.id) };
      });

      if (blockedFilter !== undefined) {
        const filtered = enriched.filter((s) => s.is_blocked === blockedFilter);
        return { data: filtered, total: filtered.length };
      }
      return { data: enriched, total };
    }

    return { data, total };
  }

  get(id: string): Task & { is_blocked?: boolean } {
    const task = this.taskRepo.findById(id);
    if (!task) throw new ServiceError("task not found", 404);
    if (this.depRepo) {
      const blockedIds = new Set(this.depRepo.getBlockedTaskIds(task.project_id));
      return { ...task, is_blocked: blockedIds.has(task.id) };
    }
    return { ...task, is_blocked: false };
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
      if (input.status !== undefined && !(TASK_STATUSES as readonly string[]).includes(input.status)) {
        throw new ServiceError(`status must be one of: ${(TASK_STATUSES as readonly string[]).join(", ")}`, 400);
      }
      if (input.effort !== undefined && !(EFFORT_LEVELS as readonly string[]).includes(input.effort)) {
        throw new ServiceError(`effort must be one of: ${(EFFORT_LEVELS as readonly string[]).join(", ")}`, 400);
      }
      if (input.impact !== undefined && !(IMPACT_LEVELS as readonly string[]).includes(input.impact)) {
        throw new ServiceError(`impact must be one of: ${(IMPACT_LEVELS as readonly string[]).join(", ")}`, 400);
      }
      if (input.category !== undefined && !(TASK_CATEGORIES as readonly string[]).includes(input.category)) {
        throw new ServiceError(`category must be one of: ${(TASK_CATEGORIES as readonly string[]).join(", ")}`, 400);
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
    this.eventBus.emit({ type: "created", entity_type: "task", ids: tasks.map((t) => t.id) });
    // Newly created tasks are never blocked
    if (this.depRepo) {
      return tasks.map((t) => ({ ...t, is_blocked: false }));
    }
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
      if (input.status !== undefined && !(TASK_STATUSES as readonly string[]).includes(input.status)) {
        throw new ServiceError(`status must be one of: ${(TASK_STATUSES as readonly string[]).join(", ")}`, 400);
      }
      if (input.effort !== undefined && input.effort !== null && !(EFFORT_LEVELS as readonly string[]).includes(input.effort)) {
        throw new ServiceError(`effort must be one of: ${(EFFORT_LEVELS as readonly string[]).join(", ")}`, 400);
      }
      if (input.impact !== undefined && input.impact !== null && !(IMPACT_LEVELS as readonly string[]).includes(input.impact)) {
        throw new ServiceError(`impact must be one of: ${(IMPACT_LEVELS as readonly string[]).join(", ")}`, 400);
      }
      if (input.category !== undefined && input.category !== null && !(TASK_CATEGORIES as readonly string[]).includes(input.category)) {
        throw new ServiceError(`category must be one of: ${(TASK_CATEGORIES as readonly string[]).join(", ")}`, 400);
      }
      const existing = this.taskRepo.findById(input.id);
      if (!existing) throw new ServiceError(`task not found: ${input.id}`, 404);
    }

    // Strip dependency arrays before passing to repo
    const repoInputs = inputs.map(({ add_dependencies, remove_dependencies, ...rest }) => rest);
    const tasks = this.taskRepo.updateMany(repoInputs);

    this.eventBus.beginBatch();
    try {
      // Process dependency operations
      if (this.depService) {
        for (const input of inputs) {
          const existing = this.taskRepo.findById(input.id);
          if (!existing) continue;

          if (input.add_dependencies && input.add_dependencies.length > 0) {
            this.depService.addDependencies(
              existing.project_id,
              input.add_dependencies.map((d) => ({
                source_task_id: d.task_id,
                target_task_id: input.id,
                dependency_type: d.type,
              })),
            );
          }
          if (input.remove_dependencies && input.remove_dependencies.length > 0) {
            this.depService.removeDependencies(
              input.remove_dependencies.map((d) => ({
                source_task_id: d.task_id,
                target_task_id: input.id,
              })),
            );
          }
        }
      }

      for (const t of tasks) {
        const input = inputs.find((i) => i.id === t.id);
        const fields = Object.keys(input ?? {}).filter((k) => k !== "id" && k !== "add_dependencies" && k !== "remove_dependencies");
        const added = input?.add_dependencies?.length ?? 0;
        const removed = input?.remove_dependencies?.length ?? 0;
        const summaryObj: Record<string, unknown> = { fields };
        if (added > 0) summaryObj.added_dependencies = added;
        if (removed > 0) summaryObj.removed_dependencies = removed;
        this.activityLog.insert({
          entity_type: "task",
          entity_id: t.id,
          action: "updated",
          summary: JSON.stringify(summaryObj),
        });
      }
      this.eventBus.emit({ type: "updated", entity_type: "task", ids: tasks.map((t) => t.id) });

      // Post-update: check if completing tasks unblocks any dependents
      if (this.depRepo) {
        for (const task of tasks) {
          const input = inputs.find((i) => i.id === task.id);
          if (!input?.status) continue; // no status change in this update
          if (input.status !== "done" && input.status !== "archived") continue;

          // This task just completed. Check what it was blocking.
          const dependents = this.depRepo.getDependenciesFrom(task.id)
            .filter((d) => d.dependency_type === "blocks");

          for (const dep of dependents) {
            // Check if the dependent task is now fully unblocked (all blockers done/archived)
            const blockers = this.depRepo.getDependenciesTo(dep.target_task_id)
              .filter((d) => d.dependency_type === "blocks");
            const allDone = blockers.every((b) => {
              const blocker = this.taskRepo.findById(b.source_task_id);
              return blocker && (blocker.status === "done" || blocker.status === "archived");
            });

            if (allDone) {
              this.activityLog.insert({
                entity_type: "task",
                entity_id: dep.target_task_id,
                action: "updated",
                summary: JSON.stringify({
                  event: "unblocked",
                  unblocked_by: task.id,
                  message: "Task unblocked: all blocking dependencies are now complete",
                }),
              });

              this.eventBus.emit({
                type: "updated",
                entity_type: "task",
                ids: [dep.target_task_id],
              });
            }
          }
        }
      }

      return tasks;
    } finally {
      this.eventBus.flushBatch();
    }
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
