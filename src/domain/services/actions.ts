import type { Action } from "../entities";
import type { CreateActionInput, UpdateActionInput } from "../inputs";
import type { IActionService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { ActionRepository } from "../repositories/actions";
import type { ProjectRepository } from "../repositories/projects";
import type { TaskRepository } from "../repositories/tasks";
import type { TemplateRepository } from "../repositories/templates";
import type { EventBus } from "../events";

const VALID_AGENTS = ["research", "design", "implementation", "review"] as const;
const VALID_TARGET_PREFIXES = ["tab:project:", "tab:task:"] as const;

export class ActionService implements IActionService {
  constructor(
    private actionRepo: ActionRepository,
    private projectRepo: ProjectRepository,
    private taskRepo: TaskRepository,
    private templateRepo: TemplateRepository,
    private eventBus?: EventBus,
  ) {}

  findByTarget(target: string, limit = 100, offset = 0): Paginated<Action> {
    return {
      data: this.actionRepo.findByTarget(target, limit, offset),
      total: this.actionRepo.countByTarget(target),
    };
  }

  findById(id: string): Action | null {
    return this.actionRepo.findById(id);
  }

  createMany(target: string, actions: { rank: number; prompt?: string; agent?: string; template_id?: string }[]): Action[] {
    this.validateTarget(target);

    const resolved: CreateActionInput[] = [];
    for (const action of actions) {
      if (!Number.isInteger(action.rank) || action.rank < 0) {
        throw new ServiceError("rank must be a non-negative integer", 400);
      }

      let prompt = action.prompt;
      let agent = action.agent;

      if (action.template_id) {
        const template = this.templateRepo.findById(action.template_id);
        if (!template) {
          throw new ServiceError(`template not found: ${action.template_id}`, 404);
        }
        prompt = action.prompt ?? template.prompt;
        agent = action.agent ?? template.agent ?? undefined;
      }

      if (!prompt?.trim()) {
        throw new ServiceError("prompt is required when no template_id is provided", 400);
      }

      if (agent !== undefined && !VALID_AGENTS.includes(agent as typeof VALID_AGENTS[number])) {
        throw new ServiceError(`agent must be one of: ${VALID_AGENTS.join(", ")}`, 400);
      }

      resolved.push({
        target,
        rank: action.rank,
        prompt,
        agent,
        template_id: action.template_id,
      });
    }

    try {
      const created = this.actionRepo.createMany(resolved);
      this.eventBus?.emit({ entity: "action", action: "created", payload: created });
      return created;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
        throw new ServiceError("duplicate rank for target", 409);
      }
      throw err;
    }
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
