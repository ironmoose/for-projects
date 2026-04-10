import type { TaskDependency, TaskDependencyDetail, NormalizedDependencyDetail, DependencyType } from "../entities";
import { DEPENDENCY_TYPES, toNormalizedDependency } from "../entities";
import type { ITaskDependencyService } from "../services";
import { ServiceError } from "../errors";
import type { ITaskDependencyRepository, ITaskRepository, IActivityLogRepository } from "../repositories/interfaces";
import type { EventBus } from "../events";

export class TaskDependencyService implements ITaskDependencyService {
  constructor(
    private depRepo: ITaskDependencyRepository,
    private taskRepo: ITaskRepository,
    private activityLog: IActivityLogRepository,
    private eventBus: EventBus,
  ) {}

  async addDependencies(projectId: string, deps: { source_task_id: string; target_task_id: string; dependency_type: DependencyType }[]): Promise<TaskDependency[]> {
    // Phase 1: Validate all inputs
    for (const dep of deps) {
      // Validate dependency_type
      if (!(DEPENDENCY_TYPES as readonly string[]).includes(dep.dependency_type)) {
        throw new ServiceError(`dependency_type must be one of: ${(DEPENDENCY_TYPES as readonly string[]).join(", ")}`, 400);
      }

      // Self-referential check
      if (dep.source_task_id === dep.target_task_id) {
        throw new ServiceError("a task cannot depend on itself", 400);
      }

      // Both tasks must exist
      const sourceTask = await this.taskRepo.findById(dep.source_task_id);
      if (!sourceTask) throw new ServiceError(`task not found: ${dep.source_task_id}`, 404);

      const targetTask = await this.taskRepo.findById(dep.target_task_id);
      if (!targetTask) throw new ServiceError(`task not found: ${dep.target_task_id}`, 404);

      // Both tasks must belong to the specified project
      if (sourceTask.project_id !== projectId || targetTask.project_id !== projectId) {
        throw new ServiceError("dependencies must be within the same project", 400);
      }
    }

    // Phase 2: Persist
    const results = await this.depRepo.addDependencies(deps);

    // Phase 3: Side effects
    for (const dep of deps) {
      await this.activityLog.insert({
        entity_type: "task",
        entity_id: dep.target_task_id,
        action: "created",
        summary: JSON.stringify({ event: "dependency_added", source_task_id: dep.source_task_id, target_task_id: dep.target_task_id, dependency_type: dep.dependency_type }),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "task", ids: [...new Set(deps.flatMap((d) => [d.source_task_id, d.target_task_id]))] });

    return results;
  }

  async removeDependencies(projectId: string, pairs: { source_task_id: string; target_task_id: string }[]): Promise<void> {
    // Validate tasks belong to the specified project
    for (const pair of pairs) {
      const sourceTask = await this.taskRepo.findById(pair.source_task_id);
      if (!sourceTask) throw new ServiceError(`task not found: ${pair.source_task_id}`, 404);

      const targetTask = await this.taskRepo.findById(pair.target_task_id);
      if (!targetTask) throw new ServiceError(`task not found: ${pair.target_task_id}`, 404);

      if (sourceTask.project_id !== projectId || targetTask.project_id !== projectId) {
        throw new ServiceError("dependencies must be within the same project", 400);
      }
    }

    await this.depRepo.removeDependencies(pairs);

    for (const pair of pairs) {
      await this.activityLog.insert({
        entity_type: "task",
        entity_id: pair.target_task_id,
        action: "deleted",
        summary: JSON.stringify({ event: "dependency_removed", source_task_id: pair.source_task_id, target_task_id: pair.target_task_id }),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "task", ids: [...new Set(pairs.flatMap((p) => [p.source_task_id, p.target_task_id]))] });
  }

  async getDependencies(taskId: string): Promise<{ blocks: NormalizedDependencyDetail[]; blocked_by: NormalizedDependencyDetail[]; relates_to: NormalizedDependencyDetail[]; is_blocked: boolean }> {
    const from = await this.depRepo.getDependenciesFrom(taskId);
    const to = await this.depRepo.getDependenciesTo(taskId);

    const rawBlocks = from.filter((d) => d.dependency_type === "blocks");
    const rawBlockedBy = to.filter((d) => d.dependency_type === "blocks");
    const rawRelatesTo = [
      ...from.filter((d) => d.dependency_type === "relates_to"),
      ...to.filter((d) => d.dependency_type === "relates_to"),
    ];
    const is_blocked = rawBlockedBy.some(
      (d) => d.source_task_status !== "done" && d.source_task_status !== "archived",
    );

    // Normalize: blocks (from this task) -> show target task
    const blocks = rawBlocks.map((d) => toNormalizedDependency(d, "target"));
    // Normalize: blocked_by (to this task) -> show source task
    const blocked_by = rawBlockedBy.map((d) => toNormalizedDependency(d, "source"));
    // Normalize: relates_to (from = show target, to = show source)
    const relates_to = rawRelatesTo.map((d) =>
      d.source_task_id === taskId
        ? toNormalizedDependency(d, "target")
        : toNormalizedDependency(d, "source"),
    );

    return { blocks, blocked_by, relates_to, is_blocked };
  }

  async getGraph(projectId: string, statusFilter?: string[]): Promise<{ edges: TaskDependency[]; blocked_task_ids: string[] }> {
    const allEdges = await this.depRepo.getGraphForProject(projectId);
    const blocked_task_ids = await this.depRepo.getBlockedTaskIds(projectId);

    if (!statusFilter || statusFilter.length === 0) {
      return { edges: allEdges, blocked_task_ids };
    }

    const allowedStatuses = new Set(statusFilter);
    const tasks = await this.taskRepo.findGraphSummaries(projectId);
    const visibleTaskIds = new Set(
      tasks.filter((t) => allowedStatuses.has(t.status)).map((t) => t.id),
    );
    const edges = allEdges.filter(
      (e) => visibleTaskIds.has(e.source_task_id) && visibleTaskIds.has(e.target_task_id),
    );

    return { edges, blocked_task_ids };
  }

  async isBlocked(taskId: string): Promise<boolean> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new ServiceError(`task not found: ${taskId}`, 404);
    return await this.depRepo.isTaskBlocked(taskId);
  }
}
