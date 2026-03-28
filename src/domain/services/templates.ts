import type { Template } from "../entities";
import type { CreateTemplateInput, UpdateTemplateInput } from "../inputs";
import type { ITemplateService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { TemplateRepository } from "../repositories/templates";
import type { EventBus } from "../events";

const VALID_AGENTS = ["research", "design", "implementation", "review"] as const;

export class TemplateService implements ITemplateService {
  constructor(private repo: TemplateRepository, private eventBus?: EventBus) {}

  findAll(limit = 50, offset = 0): Paginated<Template> {
    return {
      data: this.repo.findAll(limit, offset),
      total: this.repo.count(),
    };
  }

  findById(id: string): Template | null {
    return this.repo.findById(id);
  }

  create(input: CreateTemplateInput): Template {
    if (!input.name?.trim()) {
      throw new ServiceError("name is required", 400);
    }
    if (input.name.length > 255) {
      throw new ServiceError("name must be 255 characters or fewer", 400);
    }
    if (input.description !== undefined && input.description.length > 10000) {
      throw new ServiceError("description must be 10000 characters or fewer", 400);
    }
    if (!input.prompt?.trim()) {
      throw new ServiceError("prompt is required", 400);
    }
    if (input.agent !== undefined && !VALID_AGENTS.includes(input.agent as typeof VALID_AGENTS[number])) {
      throw new ServiceError(`agent must be one of: ${VALID_AGENTS.join(", ")}`, 400);
    }
    const template = this.repo.create(input);
    this.eventBus?.emit({ entity: "template", action: "created", payload: template });
    return template;
  }

  update(id: string, input: UpdateTemplateInput): Template | null {
    if (input.name !== undefined && !input.name.trim()) {
      throw new ServiceError("name cannot be empty", 400);
    }
    if (input.name !== undefined && input.name.length > 255) {
      throw new ServiceError("name must be 255 characters or fewer", 400);
    }
    if (input.description !== undefined && input.description.length > 10000) {
      throw new ServiceError("description must be 10000 characters or fewer", 400);
    }
    if (input.prompt !== undefined && !input.prompt.trim()) {
      throw new ServiceError("prompt cannot be empty", 400);
    }
    if (input.agent !== undefined && !VALID_AGENTS.includes(input.agent as typeof VALID_AGENTS[number])) {
      throw new ServiceError(`agent must be one of: ${VALID_AGENTS.join(", ")}`, 400);
    }
    const template = this.repo.update(id, input);
    if (template) {
      this.eventBus?.emit({ entity: "template", action: "updated", payload: template });
    }
    return template;
  }

  delete(id: string): boolean {
    const deleted = this.repo.delete(id);
    if (deleted) {
      this.eventBus?.emit({ entity: "template", action: "deleted", payload: { id } });
    }
    return deleted;
  }
}
