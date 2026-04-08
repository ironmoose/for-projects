import { type Task, type TaskSummary, type GraphTaskSummary, type DocumentReferenceSummary, type DocumentReferenceDetail, TASK_STATUSES, EFFORT_LEVELS, IMPACT_LEVELS, TASK_CATEGORIES } from "../entities";
import type { CreateTaskInput, UpdateTaskInput } from "../inputs";
import type { ITaskService, ITaskDependencyService, IDocumentReferenceService, Paginated } from "../services";
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
    private docRefService?: IDocumentReferenceService,
  ) {}


  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string[]; effort?: string; impact?: string; category?: string; title?: string; blocked?: boolean }): Paginated<TaskSummary> {
    const blockedFilter = filter?.blocked;
    // Strip blocked from the filter before passing to repo
    const repoFilter = filter ? { ...filter } : undefined;
    if (repoFilter) delete (repoFilter as Record<string, unknown>).blocked;

    const data = this.taskRepo.findManySummary(repoFilter);
    const total = this.taskRepo.count(repoFilter);

    // is_blocked is materialized on the tasks table — just filter if requested
    if (blockedFilter !== undefined) {
      const filtered = data.filter((s) => s.is_blocked === blockedFilter);
      return { data: filtered, total: filtered.length };
    }
    return { data, total };
  }

  listGraphSummaries(projectId: string, status?: string[]): GraphTaskSummary[] {
    return this.taskRepo.findGraphSummaries(projectId, status);
  }

  get(id: string): Task & { documents: DocumentReferenceDetail[] } {
    const task = this.taskRepo.findById(id);
    if (!task) throw new ServiceError("task not found", 404);
    const documents = this.docRefService?.findByEntity("task", id) ?? [];
    return { ...task, documents };
  }

  create(inputs: CreateTaskInput[]): (Task & { documents: DocumentReferenceSummary[] })[] {
    // Validate all inputs before any writes
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
      if (input.summary !== undefined && input.summary.length > 1000) {
        throw new ServiceError("summary must be 1000 characters or fewer", 400);
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
      // Pre-validate document references so we fail before creating the entity
      if (input.documents && this.docRefService) {
        this.docRefService.validateMergePatch(input.documents);
      }
    }

    const rows = inputs.map((input) => ({
      project_id: input.project_id,
      title: input.title,
      summary: input.summary ?? null,
      context: input.context ?? null,
      acceptance_criteria: input.acceptance_criteria ?? null,
      group_key: input.group_key ?? null,
      status: input.status ?? "todo",
      effort: input.effort ?? null,
      impact: input.impact ?? null,
      category: input.category ?? null,
    }));

    const tasks = this.taskRepo.insertMany(rows);

    // Create document references for each task
    for (let i = 0; i < tasks.length; i++) {
      const input = inputs[i];
      if (input.documents && this.docRefService) {
        this.docRefService.applyMergePatch("task", tasks[i].id, input.documents);
      }
    }

    for (const t of tasks) {
      this.activityLog.insert({
        entity_type: "task",
        entity_id: t.id,
        action: "created",
        summary: JSON.stringify({ title: t.title, project_id: t.project_id }),
      });
    }
    this.eventBus.emit({ type: "created", entity_type: "task", ids: tasks.map((t) => t.id) });

    // Return tasks with their document references
    return tasks.map((t) => ({
      ...t,
      documents: this.docRefService?.getReferencesForEntity("task", t.id) ?? [],
    }));
  }

  update(inputs: UpdateTaskInput[]): Task[] {
    for (const input of inputs) {
      if (input.title !== undefined && !input.title.trim()) {
        throw new ServiceError("title cannot be empty", 400);
      }
      if (input.title !== undefined && input.title.length > 255) {
        throw new ServiceError("title must be 255 characters or fewer", 400);
      }
      if (input.summary !== undefined && input.summary !== null && input.summary.length > 1000) {
        throw new ServiceError("summary must be 1000 characters or fewer", 400);
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

    // Strip dependency arrays and documents from repo input
    const repoInputs = inputs.map(({ add_dependencies, remove_dependencies, documents, ...rest }) => rest);
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

      // Process document reference merge-patch
      if (this.docRefService) {
        for (const input of inputs) {
          if (input.documents) {
            this.docRefService.applyMergePatch("task", input.id, input.documents);
          }
        }
      }

      for (const t of tasks) {
        const input = inputs.find((i) => i.id === t.id);
        const fields = Object.keys(input ?? {}).filter((k) => k !== "id" && k !== "add_dependencies" && k !== "remove_dependencies" && k !== "documents");
        const added = input?.add_dependencies?.length ?? 0;
        const removed = input?.remove_dependencies?.length ?? 0;
        const summaryObj: Record<string, unknown> = { fields };
        if (added > 0) summaryObj.added_dependencies = added;
        if (removed > 0) summaryObj.removed_dependencies = removed;
        if (input?.documents) summaryObj.documents_changed = Object.keys(input.documents).length;
        this.activityLog.insert({
          entity_type: "task",
          entity_id: t.id,
          action: "updated",
          summary: JSON.stringify(summaryObj),
        });
      }
      this.eventBus.emit({ type: "updated", entity_type: "task", ids: tasks.map((t) => t.id) });

      // Recompute is_blocked for affected tasks after dependency/status changes
      this.recomputeBlockedForUpdates(inputs, tasks);

      return tasks;
    } finally {
      this.eventBus.flushBatch();
    }
  }

  /**
   * After task updates (status changes, dependency adds/removes), recompute
   * is_blocked for all tasks that could have been affected.
   *
   * Affected tasks: the updated tasks themselves (dependency edges may have
   * changed) plus, when a task's status changed, all tasks in the same project
   * that have incoming 'blocks' edges (since the blocker's status matters).
   */
  private recomputeBlockedForUpdates(inputs: UpdateTaskInput[], tasks: Task[]): void {
    const taskIdsToRecompute = new Set<string>();

    // Tasks that had dependency edges added/removed need recomputation
    for (const input of inputs) {
      if (input.add_dependencies?.length || input.remove_dependencies?.length) {
        taskIdsToRecompute.add(input.id);
      }
    }

    // Build a map of status-changing task IDs for unblock attribution
    const statusChangedIds = new Set<string>();
    // When a task's status changes, any task it blocks may have changed blocked state.
    if (this.depRepo) {
      for (const input of inputs) {
        if (input.status === undefined) continue;
        statusChangedIds.add(input.id);
        const deps = this.depRepo.getDependenciesFrom(input.id);
        for (const dep of deps) {
          if (dep.dependency_type === "blocks") {
            taskIdsToRecompute.add(dep.target_task_id);
          }
        }
      }
    }

    if (taskIdsToRecompute.size > 0) {
      // Snapshot before recompute for unblock detection
      const beforeBlocked = new Set<string>();
      for (const taskId of taskIdsToRecompute) {
        const task = this.taskRepo.findById(taskId);
        if (task?.is_blocked) beforeBlocked.add(taskId);
      }

      this.taskRepo.recomputeBlocked([...taskIdsToRecompute]);

      // Detect unblocked tasks and emit activity/events
      for (const taskId of taskIdsToRecompute) {
        if (!beforeBlocked.has(taskId)) continue;
        const task = this.taskRepo.findById(taskId);
        if (task && !task.is_blocked) {
          // Find which completing task unblocked this one
          const unblockedBy = [...statusChangedIds].find((id) => {
            // Check if this status-changed task had a blocks edge to the unblocked task
            const deps = this.depRepo!.getDependenciesFrom(id);
            return deps.some((d) => d.target_task_id === taskId && d.dependency_type === "blocks");
          });

          this.activityLog.insert({
            entity_type: "task",
            entity_id: taskId,
            action: "updated",
            summary: JSON.stringify({
              event: "unblocked",
              unblocked_by: unblockedBy ?? tasks[0].id,
              message: "Task unblocked: all blocking dependencies are now complete",
            }),
          });
          this.eventBus.emit({ type: "updated", entity_type: "task", ids: [taskId] });
        }
      }
    }
  }

  statusCounts(projectIds: string[]): Record<string, { total: number; counts: Record<string, number> }> {
    const rawCounts = this.taskRepo.getStatusCountsByProject(projectIds);
    const result: Record<string, { total: number; counts: Record<string, number> }> = {};
    for (const projectId of projectIds) {
      const counts = rawCounts[projectId] ?? {};
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      result[projectId] = { total, counts };
    }
    return result;
  }

  remove(ids: string[]): void {
    // Collect dependents before deletion (CASCADE will remove edges)
    const dependentsToRecompute = new Set<string>();
    if (this.depRepo) {
      for (const id of ids) {
        const deps = this.depRepo.getDependenciesFrom(id);
        for (const dep of deps) {
          if (dep.dependency_type === "blocks" && !ids.includes(dep.target_task_id)) {
            dependentsToRecompute.add(dep.target_task_id);
          }
        }
      }
    }

    for (const id of ids) {
      this.docRefService?.removeAllForEntity("task", id);
    }
    this.taskRepo.deleteMany(ids);

    // Recompute is_blocked for dependents of deleted tasks
    if (dependentsToRecompute.size > 0) {
      this.taskRepo.recomputeBlocked([...dependentsToRecompute]);
    }

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
