import type { Run, RunDailyStats, RunSummaryStats, RunStatus, EntityType } from "../entities";
import type { CreateRunInput, UpdateRunInput } from "../inputs";
import type { IRunService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { RunRepository } from "../repositories/runs";
import type { AgentRepository } from "../repositories/agents";
import type { EventBus } from "../events";

const VALID_ENTITY_TYPES: EntityType[] = ['project', 'task'];
const VALID_STATUSES: RunStatus[] = ['todo', 'running', 'done', 'failed', 'cancelled'];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export class RunService implements IRunService {
  constructor(
    private runRepo: RunRepository,
    private agentRepo: AgentRepository,
    private eventBus: EventBus,
  ) {}

  list(filter?: {
    id?: string;
    limit?: number;
    offset?: number;
    entity_type?: EntityType;
    entity_id?: string;
    agent?: string;
    status?: RunStatus;
    search?: string;
    started_after?: string;
    started_before?: string;
    finished_after?: string;
    agent_identifier?: string;
  }): Paginated<Run> {
    if (filter?.search !== undefined && filter.search.length > 200) {
      throw new ServiceError("search must be at most 200 characters", 400);
    }
    if (filter?.started_after !== undefined && !ISO_DATE_RE.test(filter.started_after)) {
      throw new ServiceError("started_after must be a valid ISO 8601 date", 400);
    }
    if (filter?.started_before !== undefined && !ISO_DATE_RE.test(filter.started_before)) {
      throw new ServiceError("started_before must be a valid ISO 8601 date", 400);
    }

    return {
      data: this.runRepo.findMany(filter),
      total: this.runRepo.count(filter),
    };
  }

  get(id: string): Run {
    const entry = this.runRepo.findById(id);
    if (!entry) throw new ServiceError("run not found", 404);
    return entry;
  }

  create(inputs: CreateRunInput[]): Run[] {
    for (const input of inputs) {
      if (!input.agent?.trim()) {
        throw new ServiceError("agent is required", 400);
      }
      if (!VALID_ENTITY_TYPES.includes(input.entity_type)) {
        throw new ServiceError(`entity_type must be one of: ${VALID_ENTITY_TYPES.join(", ")}`, 400);
      }
    }

    const now = new Date().toISOString();
    const rows = inputs.map((input) => ({
      agent: input.agent,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      status: 'running' as const,
      output: null,
      started_at: input.started_at ?? now,
      finished_at: null,
    }));

    const entries = this.runRepo.insertMany(rows);
    this.eventBus.emit({ type: "created", entity_type: "run", payload: entries });
    return entries;
  }

  update(inputs: UpdateRunInput[]): Run[] {
    for (const input of inputs) {
      const existing = this.runRepo.findById(input.id);
      if (!existing) throw new ServiceError(`run not found: ${input.id}`, 404);

      if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
        throw new ServiceError(`status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
      }
    }

    const TERMINAL: RunStatus[] = ['done', 'failed', 'cancelled'];
    const now = new Date().toISOString();
    const mapped = inputs.map((input) => ({
      ...input,
      finished_at: input.status !== undefined && TERMINAL.includes(input.status)
        ? now
        : input.finished_at,
    }));

    const entries = this.runRepo.updateMany(mapped);
    this.eventBus.emit({ type: "updated", entity_type: "run", payload: entries });
    return entries;
  }

  remove(ids: string[]): void {
    this.runRepo.deleteMany(ids);
    this.eventBus.emit({ type: "deleted", entity_type: "run", ids });
  }

  stats(days?: number): { daily: RunDailyStats[]; summary: RunSummaryStats } {
    const d = days ?? 30;
    if (d < 1 || d > 365) {
      throw new ServiceError("days must be between 1 and 365", 400);
    }
    return {
      daily: this.runRepo.getDaily(d),
      summary: this.runRepo.getSummary(),
    };
  }
}
