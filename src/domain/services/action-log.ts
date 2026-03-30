import type { ActionLogEntry, ActionLogDailyStats, ActionLogSummaryStats, ActionLogStatus, ActionKind, EntityType } from "../entities";
import type { CreateActionLogInput, UpdateActionLogInput } from "../inputs";
import type { IActionLogService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { ActionLogRepository } from "../repositories/action-log";
import type { ActionRepository } from "../repositories/actions";
import type { EventBus } from "../events";

const VALID_ENTITY_TYPES: EntityType[] = ['project', 'task'];
const VALID_ACTION_KINDS: ActionKind[] = ['plan', 'goal', 'requirements', 'design'];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

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
    search?: string;
    started_after?: string;
    started_before?: string;
    finished_after?: string;
    action_kind?: string;
  }): Paginated<ActionLogEntry> {
    if (filter?.search !== undefined && filter.search.length > 200) {
      throw new ServiceError("search must be at most 200 characters", 400);
    }
    if (filter?.started_after !== undefined && !ISO_DATE_RE.test(filter.started_after)) {
      throw new ServiceError("started_after must be a valid ISO 8601 date", 400);
    }
    if (filter?.started_before !== undefined && !ISO_DATE_RE.test(filter.started_before)) {
      throw new ServiceError("started_before must be a valid ISO 8601 date", 400);
    }
    if (filter?.action_kind !== undefined && !VALID_ACTION_KINDS.includes(filter.action_kind as ActionKind)) {
      throw new ServiceError(`action_kind must be one of: ${VALID_ACTION_KINDS.join(", ")}`, 400);
    }

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

  stats(days?: number): { daily: ActionLogDailyStats[]; summary: ActionLogSummaryStats } {
    const d = days ?? 30;
    if (d < 1 || d > 365) {
      throw new ServiceError("days must be between 1 and 365", 400);
    }
    return {
      daily: this.actionLogRepo.getDaily(d),
      summary: this.actionLogRepo.getSummary(),
    };
  }
}
