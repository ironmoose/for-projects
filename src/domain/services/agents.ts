import { type Agent, toAgentSummary } from "../entities";
import type { CreateAgentInput, UpdateAgentInput } from "../inputs";
import type { IAgentService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { AgentRepository } from "../repositories/agents";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";

export class AgentService implements IAgentService {
  constructor(
    private repo: AgentRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
  ) {}

  list(filter?: { id?: string; limit?: number; offset?: number }): Paginated<Agent> {
    return {
      data: this.repo.findMany(filter).map(toAgentSummary),
      total: this.repo.count(filter),
    };
  }

  get(id: string): Agent {
    const agent = this.repo.findById(id);
    if (!agent) throw new ServiceError("agent not found", 404);
    return agent;
  }

  create(inputs: CreateAgentInput[]): Agent[] {
    for (const input of inputs) {
      if (!input.name?.trim()) {
        throw new ServiceError("name is required", 400);
      }
      if (input.name.length > 255) {
        throw new ServiceError("name must be 255 characters or fewer", 400);
      }
      if (input.description !== undefined && input.description.length > 10000) {
        throw new ServiceError("description must be 10000 characters or fewer", 400);
      }
      if (input.platform_agent !== undefined && input.platform_agent.length > 255) {
        throw new ServiceError("platform_agent must be 255 characters or fewer", 400);
      }
      if (input.prompt !== undefined && input.prompt.length > 50000) {
        throw new ServiceError("prompt must be 50000 characters or fewer", 400);
      }
    }

    const rows = inputs.map((input) => ({
      name: input.name,
      description: input.description ?? null,
      platform_agent: input.platform_agent ?? null,
      prompt: input.prompt ?? null,
    }));

    const agents = this.repo.insertMany(rows);
    for (const a of agents) {
      this.activityLog.insert({
        entity_type: "agent",
        entity_id: a.id,
        action: "created",
        summary: JSON.stringify({ name: a.name }),
      });
    }
    this.eventBus.emit({ type: "created", entity_type: "agent", payload: agents });
    return agents;
  }

  update(inputs: UpdateAgentInput[]): Agent[] {
    for (const input of inputs) {
      if (input.name !== undefined && !input.name.trim()) {
        throw new ServiceError("name cannot be empty", 400);
      }
      if (input.name !== undefined && input.name.length > 255) {
        throw new ServiceError("name must be 255 characters or fewer", 400);
      }
      if (input.description !== undefined && input.description !== null && input.description.length > 10000) {
        throw new ServiceError("description must be 10000 characters or fewer", 400);
      }
      if (input.platform_agent !== undefined && input.platform_agent !== null && input.platform_agent.length > 255) {
        throw new ServiceError("platform_agent must be 255 characters or fewer", 400);
      }
      if (input.prompt !== undefined && input.prompt !== null && input.prompt.length > 50000) {
        throw new ServiceError("prompt must be 50000 characters or fewer", 400);
      }
      const existing = this.repo.findById(input.id);
      if (!existing) throw new ServiceError(`agent not found: ${input.id}`, 404);
    }

    const agents = this.repo.updateMany(inputs);
    for (const a of agents) {
      const fields = Object.keys(inputs.find((i) => i.id === a.id) ?? {}).filter((k) => k !== "id");
      this.activityLog.insert({
        entity_type: "agent",
        entity_id: a.id,
        action: "updated",
        summary: JSON.stringify({ fields }),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "agent", payload: agents });
    return agents;
  }

  remove(ids: string[]): void {
    this.repo.deleteMany(ids);
    for (const id of ids) {
      this.activityLog.insert({
        entity_type: "agent",
        entity_id: id,
        action: "deleted",
        summary: JSON.stringify({}),
      });
    }
    this.eventBus.emit({ type: "deleted", entity_type: "agent", ids });
  }
}
