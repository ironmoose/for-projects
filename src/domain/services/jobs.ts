import { type Job, type JobSummary, toJobSummary } from "../entities";
import type { CreateJobInput, UpdateJobInput } from "../inputs";
import type { IJobService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { JobRepository } from "../repositories/jobs";
import type { AgentRepository } from "../repositories/agents";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";

const VALID_STATUSES = ["todo", "running", "done", "failed", "cancelled"];

export class JobService implements IJobService {
  constructor(
    private repo: JobRepository,
    private agentRepo: AgentRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
  ) {}

  list(filter?: { id?: string; agent_id?: string; status?: string; limit?: number; offset?: number }): Paginated<JobSummary> {
    return {
      data: this.repo.findMany(filter).map(toJobSummary),
      total: this.repo.count(filter),
    };
  }

  get(id: string): Job {
    const job = this.repo.findById(id);
    if (!job) throw new ServiceError("job not found", 404);
    return job;
  }

  create(inputs: CreateJobInput[]): Job[] {
    for (const input of inputs) {
      if (!input.agent_id?.trim()) {
        throw new ServiceError("agent_id is required", 400);
      }
      const agent = this.agentRepo.findById(input.agent_id);
      if (!agent) throw new ServiceError(`agent not found: ${input.agent_id}`, 404);

      const status = input.status ?? "todo";
      if (!VALID_STATUSES.includes(status)) {
        throw new ServiceError(`status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
      }
      if (input.input !== undefined && input.input.length > 50000) {
        throw new ServiceError("input must be 50000 characters or fewer", 400);
      }
    }

    const rows = inputs.map((input) => ({
      agent_id: input.agent_id,
      status: input.status ?? "todo",
      input: input.input ?? null,
      output: null,
      started_at: null,
      ended_at: null,
    }));

    const jobs = this.repo.insertMany(rows);
    for (const j of jobs) {
      this.activityLog.insert({
        entity_type: "job",
        entity_id: j.id,
        action: "created",
        summary: JSON.stringify({ agent_id: j.agent_id, status: j.status }),
      });
    }
    this.eventBus.emit({ type: "created", entity_type: "job", payload: jobs });
    return jobs;
  }

  update(inputs: UpdateJobInput[]): Job[] {
    for (const input of inputs) {
      if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
        throw new ServiceError(`status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
      }
      if (input.output !== undefined && input.output !== null && input.output.length > 50000) {
        throw new ServiceError("output must be 50000 characters or fewer", 400);
      }
      if (input.input !== undefined && input.input !== null && input.input.length > 50000) {
        throw new ServiceError("input must be 50000 characters or fewer", 400);
      }
      const existing = this.repo.findById(input.id);
      if (!existing) throw new ServiceError(`job not found: ${input.id}`, 404);
    }

    const jobs = this.repo.updateMany(inputs);
    for (const j of jobs) {
      const fields = Object.keys(inputs.find((i) => i.id === j.id) ?? {}).filter((k) => k !== "id");
      this.activityLog.insert({
        entity_type: "job",
        entity_id: j.id,
        action: "updated",
        summary: JSON.stringify({ fields }),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "job", payload: jobs });
    return jobs;
  }

  remove(ids: string[]): void {
    this.repo.deleteMany(ids);
    for (const id of ids) {
      this.activityLog.insert({
        entity_type: "job",
        entity_id: id,
        action: "deleted",
        summary: JSON.stringify({}),
      });
    }
    this.eventBus.emit({ type: "deleted", entity_type: "job", ids });
  }
}
