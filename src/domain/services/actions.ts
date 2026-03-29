import { ulid } from "ulid";
import type { Action } from "../entities";
import type { CreateActionInput, UpdateActionInput } from "../inputs";
import type { ActionFilter, IActionService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { ActionRepository } from "../repositories/actions";
import type { EventBus } from "../events";

const VALID_AGENTS = ["research", "design", "implementation", "review"] as const;

export class ActionService implements IActionService {
  constructor(
    private actionRepo: ActionRepository,
    private eventBus?: EventBus,
  ) {}

  create(input: CreateActionInput): Action {
    if (!input.prompt?.trim()) throw new ServiceError("prompt is required", 400);
    if (input.agent !== undefined && !VALID_AGENTS.includes(input.agent as typeof VALID_AGENTS[number])) {
      throw new ServiceError(`agent must be one of: ${VALID_AGENTS.join(", ")}`, 400);
    }
    const id = ulid();
    const now = new Date().toISOString();
    this.actionRepo.create({
      id, prompt: input.prompt, agent: input.agent ?? null,
      created_at: now, updated_at: now,
    });
    const action = this.actionRepo.findById(id)!;
    this.eventBus?.emit({ entity: "action", action: "created", payload: action });
    return action;
  }

  update(id: string, input: UpdateActionInput): Action | null {
    const existing = this.actionRepo.findById(id);
    if (!existing) return null;
    if (input.prompt !== undefined && !input.prompt.trim()) throw new ServiceError("prompt cannot be empty", 400);
    if (input.agent !== undefined && !VALID_AGENTS.includes(input.agent as typeof VALID_AGENTS[number])) {
      throw new ServiceError(`agent must be one of: ${VALID_AGENTS.join(", ")}`, 400);
    }
    const now = new Date().toISOString();
    this.actionRepo.update(id, { prompt: input.prompt, agent: input.agent, updated_at: now });
    const updated = this.actionRepo.findById(id)!;
    this.eventBus?.emit({ entity: "action", action: "updated", payload: updated });
    return updated;
  }

  findAll(limit = 50, offset = 0, filter?: ActionFilter): Paginated<Action> {
    return {
      data: this.actionRepo.findAll(limit, offset, { agent: filter?.agent }),
      total: this.actionRepo.count({ agent: filter?.agent }),
    };
  }

  findById(id: string): Action | null {
    return this.actionRepo.findById(id);
  }
}
