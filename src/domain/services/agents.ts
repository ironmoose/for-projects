import type { Agent, AgentType } from "../entities";
import type { CreateAgentInput, UpdateAgentInput } from "../inputs";
import type { IAgentService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { AgentRepository } from "../repositories/agents";
import type { EventBus } from "../events";

const VALID_AGENTS: AgentType[] = ['tab:orchestrator', 'tab:executor'];

export class AgentService implements IAgentService {
  constructor(
    private repo: AgentRepository,
    private eventBus: EventBus,
  ) {}

  list(filter?: { id?: string; limit?: number; offset?: number; identifier?: string; enabled?: boolean }): Paginated<Agent> {
    return {
      data: this.repo.findMany(filter),
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
      if (!input.identifier?.trim()) {
        throw new ServiceError("identifier is required", 400);
      }
      const existing = this.repo.findByIdentifier(input.identifier);
      if (existing) {
        throw new ServiceError(`agent with identifier '${input.identifier}' already exists`, 409);
      }
      if (!input.prompt?.trim()) {
        throw new ServiceError("prompt is required", 400);
      }
      if (!VALID_AGENTS.includes(input.agent)) {
        throw new ServiceError(`agent must be one of: ${VALID_AGENTS.join(", ")}`, 400);
      }
    }

    const rows = inputs.map((input) => ({
      identifier: input.identifier,
      prompt: input.prompt,
      agent: input.agent,
      enabled: input.enabled !== undefined ? input.enabled : true,
    }));

    const agents = this.repo.insertMany(rows);
    this.eventBus.emit({ type: "created", entity_type: "agent", payload: agents });
    return agents;
  }

  update(inputs: UpdateAgentInput[]): Agent[] {
    for (const input of inputs) {
      const existing = this.repo.findById(input.id);
      if (!existing) throw new ServiceError(`agent not found: ${input.id}`, 404);

      if (input.identifier !== undefined) {
        if (!input.identifier.trim()) {
          throw new ServiceError("identifier cannot be empty", 400);
        }
        if (input.identifier !== existing.identifier) {
          const conflict = this.repo.findByIdentifier(input.identifier);
          if (conflict) {
            throw new ServiceError(`agent with identifier '${input.identifier}' already exists`, 409);
          }
        }
      }
      if (input.prompt !== undefined && !input.prompt.trim()) {
        throw new ServiceError("prompt cannot be empty", 400);
      }
      if (input.agent !== undefined && !VALID_AGENTS.includes(input.agent)) {
        throw new ServiceError(`agent must be one of: ${VALID_AGENTS.join(", ")}`, 400);
      }
    }

    const agents = this.repo.updateMany(inputs);
    this.eventBus.emit({ type: "updated", entity_type: "agent", payload: agents });
    return agents;
  }

  remove(ids: string[]): void {
    this.repo.deleteMany(ids);
    this.eventBus.emit({ type: "deleted", entity_type: "agent", ids });
  }
}
