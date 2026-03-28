import type { Action, ActionStatus } from "../entities";
import type { CreateActionInput, UpdateActionInput } from "../inputs";
import type { IActionService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { ActionRepository } from "../repositories/actions";
import type { ProjectRepository } from "../repositories/projects";
import type { TaskRepository } from "../repositories/tasks";
import type { EventBus } from "../events";

const VALID_AGENTS = ["research", "design", "implementation", "review"] as const;
const VALID_TARGET_PREFIXES = ["tab:project:", "tab:task:"] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  'todo': ['in_progress'],
  'in_progress': ['complete', 'failed'],
  'complete': [],
  'failed': ['todo'],
};

export class ActionService implements IActionService {
  constructor(
    private actionRepo: ActionRepository,
    private projectRepo: ProjectRepository,
    private taskRepo: TaskRepository,
    private eventBus?: EventBus,
  ) {}

  findByTarget(target: string, limit = 100, offset = 0, status?: string): Paginated<Action> {
    return {
      data: this.actionRepo.findByTarget(target, limit, offset, status),
      total: this.actionRepo.countByTarget(target, status),
    };
  }

  findById(id: string): Action | null {
    return this.actionRepo.findById(id);
  }

  createMany(target: string, actions: { rank: number; prompt?: string; agent?: string }[]): Action[] {
    this.validateTarget(target);

    const resolved: CreateActionInput[] = [];
    for (const action of actions) {
      if (!Number.isInteger(action.rank) || action.rank < 0) {
        throw new ServiceError("rank must be a non-negative integer", 400);
      }

      const prompt = action.prompt;

      if (!prompt?.trim()) {
        throw new ServiceError("prompt is required", 400);
      }

      const agent = action.agent;
      if (agent !== undefined && !VALID_AGENTS.includes(agent as typeof VALID_AGENTS[number])) {
        throw new ServiceError(`agent must be one of: ${VALID_AGENTS.join(", ")}`, 400);
      }

      resolved.push({
        target,
        rank: action.rank,
        prompt,
        agent,
      });
    }

    const created = this.actionRepo.createMany(resolved);
    this.eventBus?.emit({ entity: "action", action: "created", payload: created });
    return created;
  }

  updateMany(target: string, updates: UpdateActionInput[]): Action[] {
    for (const update of updates) {
      const existing = this.actionRepo.findById(update.id);
      if (!existing) {
        throw new ServiceError(`action not found: ${update.id}`, 404);
      }
      if (existing.target !== target) {
        throw new ServiceError(`action ${update.id} does not belong to target ${target}`, 400);
      }
      if (update.prompt !== undefined && !update.prompt.trim()) {
        throw new ServiceError("prompt cannot be empty", 400);
      }
      if (update.agent !== undefined && !VALID_AGENTS.includes(update.agent as typeof VALID_AGENTS[number])) {
        throw new ServiceError(`agent must be one of: ${VALID_AGENTS.join(", ")}`, 400);
      }
    }

    const updated = this.actionRepo.updateMany(updates);
    if (updated.length > 0) {
      this.eventBus?.emit({ entity: "action", action: "updated", payload: updated });
    }
    return updated;
  }

  deleteMany(target: string, ids: string[]): number {
    for (const id of ids) {
      const existing = this.actionRepo.findById(id);
      if (!existing) {
        throw new ServiceError(`action not found: ${id}`, 404);
      }
      if (existing.target !== target) {
        throw new ServiceError(`action ${id} does not belong to target ${target}`, 400);
      }
    }

    const deleted = this.actionRepo.deleteMany(ids);
    if (deleted > 0) {
      this.eventBus?.emit({ entity: "action", action: "deleted", payload: ids.map(id => ({ id })) });
    }
    return deleted;
  }

  updateStatus(id: string, status: ActionStatus): Action | null {
    const existing = this.actionRepo.findById(id);
    if (!existing) {
      throw new ServiceError(`action not found: ${id}`, 404);
    }

    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed || !allowed.includes(status)) {
      throw new ServiceError(
        `invalid status transition: ${existing.status} → ${status}`,
        400
      );
    }

    const updated = this.actionRepo.updateStatus(id, status);
    if (updated) {
      this.eventBus?.emit({ entity: "action", action: "status_changed", payload: [updated] });

      if (this.actionRepo.isTierComplete(existing.target, existing.rank)) {
        this.eventBus?.emit({
          entity: "action",
          action: "tier_complete",
          payload: { target: existing.target, rank: existing.rank },
        });
      }
    }

    return updated;
  }

  getExecutableActions(target: string): Action[] {
    return this.actionRepo.findExecutableActions(target);
  }

  getActionPlan(target: string): Array<{ rank: number; actions: Action[] }> {
    const map = this.actionRepo.findByTargetGroupedByRank(target);
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rank, actions]) => ({ rank, actions }));
  }

  getDashboardData(): { executable: Action[]; inProgress: Action[]; recentlyTerminal: Action[] } {
    const activeTargets = this.actionRepo.findActiveTargets();
    const executable: Action[] = [];
    for (const target of activeTargets) {
      const tierActions = this.actionRepo.findExecutableActions(target);
      // Only include "todo" actions as executable — in_progress ones belong in the inProgress column
      executable.push(...tierActions.filter(a => a.status === 'todo'));
    }

    const inProgress = this.actionRepo.findByStatus('in_progress');
    const recentlyTerminal = this.actionRepo.findRecentlyTerminal(10);

    return { executable, inProgress, recentlyTerminal };
  }

  private validateTarget(target: string): void {
    const prefix = VALID_TARGET_PREFIXES.find((p) => target.startsWith(p));
    if (!prefix) {
      throw new ServiceError(`target must start with one of: ${VALID_TARGET_PREFIXES.join(", ")}`, 400);
    }

    const resourceId = target.slice(prefix.length);
    if (!resourceId) {
      throw new ServiceError("target must include a resource ID", 400);
    }

    if (prefix === "tab:project:") {
      const project = this.projectRepo.findById(resourceId);
      if (!project) {
        throw new ServiceError(`project not found: ${resourceId}`, 404);
      }
    } else if (prefix === "tab:task:") {
      const task = this.taskRepo.findById(resourceId);
      if (!task) {
        throw new ServiceError(`task not found: ${resourceId}`, 404);
      }
    }
  }
}
