import type { TaskDependency, TaskDependencyDetail, NormalizedDependencyDetail, DependencyType } from "../entities";
import { DEPENDENCY_TYPES, toNormalizedDependency } from "../entities";
import type { ITaskDependencyService } from "../services";
import { ServiceError } from "../errors";
import type { TaskDependencyRepository } from "../repositories/task-dependencies";
import type { TaskRepository } from "../repositories/tasks";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";

function wouldCreateCycle(
  existingEdges: TaskDependency[],
  newEdge: { source_task_id: string; target_task_id: string },
): boolean {
  // Build adjacency list from existing 'blocks' edges + the proposed edge
  const adj = new Map<string, Set<string>>();
  for (const edge of existingEdges) {
    if (edge.dependency_type !== "blocks") continue;
    if (!adj.has(edge.source_task_id)) adj.set(edge.source_task_id, new Set());
    adj.get(edge.source_task_id)!.add(edge.target_task_id);
  }
  // Add the proposed edge
  if (!adj.has(newEdge.source_task_id)) adj.set(newEdge.source_task_id, new Set());
  adj.get(newEdge.source_task_id)!.add(newEdge.target_task_id);

  // DFS from target to see if we can reach source (which means a cycle)
  const visited = new Set<string>();
  const stack = [newEdge.target_task_id];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === newEdge.source_task_id) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const neighbor of adj.get(node) ?? []) {
      stack.push(neighbor);
    }
  }
  return false;
}

export class TaskDependencyService implements ITaskDependencyService {
  constructor(
    private depRepo: TaskDependencyRepository,
    private taskRepo: TaskRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
  ) {}

  addDependencies(projectId: string, deps: { source_task_id: string; target_task_id: string; dependency_type: DependencyType }[]): TaskDependency[] {
    // Phase 1: Validate all inputs
    const proposedEdges: TaskDependency[] = [];
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
      const sourceTask = this.taskRepo.findById(dep.source_task_id);
      if (!sourceTask) throw new ServiceError(`task not found: ${dep.source_task_id}`, 404);

      const targetTask = this.taskRepo.findById(dep.target_task_id);
      if (!targetTask) throw new ServiceError(`task not found: ${dep.target_task_id}`, 404);

      // Both tasks must belong to the specified project
      if (sourceTask.project_id !== projectId || targetTask.project_id !== projectId) {
        throw new ServiceError("dependencies must be within the same project", 400);
      }

      // Cycle detection -- only for 'blocks' type
      if (dep.dependency_type === "blocks") {
        const existingEdges = this.depRepo.getGraphForProject(projectId);
        if (wouldCreateCycle([...existingEdges, ...proposedEdges], dep)) {
          throw new ServiceError("adding this dependency would create a cycle", 400);
        }
        proposedEdges.push({ source_task_id: dep.source_task_id, target_task_id: dep.target_task_id, dependency_type: dep.dependency_type, created_at: "" });
      }
    }

    // Phase 2: Persist
    const results = this.depRepo.addDependencies(deps);

    // Phase 3: Side effects
    for (const dep of deps) {
      this.activityLog.insert({
        entity_type: "task",
        entity_id: dep.target_task_id,
        action: "created",
        summary: JSON.stringify({ event: "dependency_added", source_task_id: dep.source_task_id, target_task_id: dep.target_task_id, dependency_type: dep.dependency_type }),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "task", payload: deps });

    return results;
  }

  removeDependencies(pairs: { source_task_id: string; target_task_id: string }[]): void {
    this.depRepo.removeDependencies(pairs);

    for (const pair of pairs) {
      this.activityLog.insert({
        entity_type: "task",
        entity_id: pair.target_task_id,
        action: "deleted",
        summary: JSON.stringify({ event: "dependency_removed", source_task_id: pair.source_task_id, target_task_id: pair.target_task_id }),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "task", payload: pairs });
  }

  getDependencies(taskId: string): { blocks: NormalizedDependencyDetail[]; blocked_by: NormalizedDependencyDetail[]; relates_to: NormalizedDependencyDetail[]; is_blocked: boolean } {
    const from = this.depRepo.getDependenciesFrom(taskId);
    const to = this.depRepo.getDependenciesTo(taskId);

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

  getGraph(projectId: string): { edges: TaskDependency[]; blocked_task_ids: string[] } {
    const edges = this.depRepo.getGraphForProject(projectId);
    const blocked_task_ids = this.depRepo.getBlockedTaskIds(projectId);
    return { edges, blocked_task_ids };
  }

  isBlocked(taskId: string): boolean {
    const task = this.taskRepo.findById(taskId);
    if (!task) throw new ServiceError(`task not found: ${taskId}`, 404);
    const blockedIds = this.depRepo.getBlockedTaskIds(task.project_id);
    return blockedIds.includes(taskId);
  }
}
