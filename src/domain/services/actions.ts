import type { Action, ActionKind, AgentType } from "../entities";
import type { CreateActionInput, UpdateActionInput } from "../inputs";
import type { IActionService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { ActionRepository } from "../repositories/actions";
import type { EventBus } from "../events";

const VALID_KINDS: ActionKind[] = ['plan', 'goal', 'requirements', 'design'];
const VALID_AGENTS: AgentType[] = ['tab:orchestrator', 'tab:executor'];

export class ActionService implements IActionService {
  constructor(
    private actionRepo: ActionRepository,
    private eventBus: EventBus,
  ) {}

  list(filter?: { id?: string; limit?: number; offset?: number; kind?: ActionKind }): Paginated<Action> {
    return {
      data: this.actionRepo.findMany(filter),
      total: this.actionRepo.count(filter),
    };
  }

  get(id: string): Action {
    const action = this.actionRepo.findById(id);
    if (!action) throw new ServiceError("action not found", 404);
    return action;
  }

  create(inputs: CreateActionInput[]): Action[] {
    for (const input of inputs) {
      if (!VALID_KINDS.includes(input.kind)) {
        throw new ServiceError(`kind must be one of: ${VALID_KINDS.join(", ")}`, 400);
      }
      if (!input.prompt?.trim()) {
        throw new ServiceError("prompt is required", 400);
      }
      if (!VALID_AGENTS.includes(input.agent)) {
        throw new ServiceError(`agent must be one of: ${VALID_AGENTS.join(", ")}`, 400);
      }
      const existing = this.actionRepo.findByKind(input.kind);
      if (existing) {
        throw new ServiceError(`action with kind '${input.kind}' already exists`, 409);
      }
    }

    const rows = inputs.map((input) => ({
      kind: input.kind,
      prompt: input.prompt,
      agent: input.agent,
    }));

    const actions = this.actionRepo.insertMany(rows);
    this.eventBus.emit({ type: "created", entity_type: "action", payload: actions });
    return actions;
  }

  update(inputs: UpdateActionInput[]): Action[] {
    for (const input of inputs) {
      const existing = this.actionRepo.findById(input.id);
      if (!existing) throw new ServiceError(`action not found: ${input.id}`, 404);

      if (input.kind !== undefined && !VALID_KINDS.includes(input.kind)) {
        throw new ServiceError(`kind must be one of: ${VALID_KINDS.join(", ")}`, 400);
      }
      if (input.prompt !== undefined && !input.prompt.trim()) {
        throw new ServiceError("prompt cannot be empty", 400);
      }
      if (input.agent !== undefined && !VALID_AGENTS.includes(input.agent)) {
        throw new ServiceError(`agent must be one of: ${VALID_AGENTS.join(", ")}`, 400);
      }
      if (input.kind !== undefined && input.kind !== existing.kind) {
        const conflict = this.actionRepo.findByKind(input.kind);
        if (conflict) {
          throw new ServiceError(`action with kind '${input.kind}' already exists`, 409);
        }
      }
    }

    const actions = this.actionRepo.updateMany(inputs);
    this.eventBus.emit({ type: "updated", entity_type: "action", payload: actions });
    return actions;
  }

  remove(ids: string[]): void {
    this.actionRepo.deleteMany(ids);
    this.eventBus.emit({ type: "deleted", entity_type: "action", ids });
  }
}
