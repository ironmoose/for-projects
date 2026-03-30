import type { ActionLogEntry, ActionLogStatus, EntityType } from "../entities";
import type { CreateActionLogInput, UpdateActionLogInput } from "../inputs";
import type { IActionLogService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { ActionLogRepository } from "../repositories/action-log";
import type { ActionRepository } from "../repositories/actions";
import type { EventBus } from "../events";

const VALID_ENTITY_TYPES: EntityType[] = ['project', 'task'];

export class ActionLogService implements IActionLogService {
  constructor(
    private actionLogRepo: ActionLogRepository,
    private actionRepo: ActionRepository,
    private eventBus: EventBus,
  ) {}

  list(filter?: {
    id?: string;
    limit?: number;
    offset?: number;
    entity_type?: EntityType;
    entity_id?: string;
    action_id?: string;
    status?: ActionLogStatus;
    started_after?: string;
    finished_after?: string;
  }): Paginated<ActionLogEntry> {
    return {
      data: this.actionLogRepo.findMany(filter),
      total: this.actionLogRepo.count(filter),
    };
  }

  get(id: string): ActionLogEntry {
    const entry = this.actionLogRepo.findById(id);
    if (!entry) throw new ServiceError("action log entry not found", 404);
    return entry;
  }

  create(inputs: CreateActionLogInput[]): ActionLogEntry[] {
    for (const input of inputs) {
      const action = this.actionRepo.findById(input.action_id);
      if (!action) {
        throw new ServiceError(`action not found: ${input.action_id}`, 404);
      }
      if (!VALID_ENTITY_TYPES.includes(input.entity_type)) {
        throw new ServiceError(`entity_type must be one of: ${VALID_ENTITY_TYPES.join(", ")}`, 400);
      }
    }

    const now = new Date().toISOString();
    const rows = inputs.map((input) => ({
      action_id: input.action_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      status: 'running' as const,
      output: null,
      started_at: now,
      finished_at: null,
    }));

    const entries = this.actionLogRepo.insertMany(rows);
    this.eventBus.emit({ type: "created", entity_type: "action_log", payload: entries });
    return entries;
  }

  update(inputs: UpdateActionLogInput[]): ActionLogEntry[] {
    for (const input of inputs) {
      const existing = this.actionLogRepo.findById(input.id);
      if (!existing) throw new ServiceError(`action log entry not found: ${input.id}`, 404);
    }

    const entries = this.actionLogRepo.updateMany(inputs);
    this.eventBus.emit({ type: "updated", entity_type: "action_log", payload: entries });
    return entries;
  }
}
