import { type Automation, type AutomationSummary, type TagName, TAG_NAMES } from "../entities";
import type { CreateAutomationInput, UpdateAutomationInput } from "../inputs";
import type { IAutomationService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { IAutomationRepository, ITagRepository, IActivityLogRepository } from "../repositories/interfaces";
import type { EventBus } from "../events";

export class AutomationService implements IAutomationService {
  constructor(
    private automationRepo: IAutomationRepository,
    private tagRepo: ITagRepository,
    private activityLog: IActivityLogRepository,
    private eventBus: EventBus,
  ) {}

  async list(filter?: { title?: string; category?: string; is_favorite?: boolean; tag?: string; limit?: number; offset?: number }): Promise<Paginated<AutomationSummary>> {
    const summaries = await this.automationRepo.findMany(filter);
    const ids = summaries.map((s) => s.id);
    const tagMap = await this.tagRepo.getTagsForEntities("automation", ids);
    const data = summaries.map((s) => ({
      ...s,
      tags: tagMap.get(s.id) ?? [],
    }));
    return {
      data,
      total: await this.automationRepo.count(filter),
    };
  }

  async get(id: string): Promise<Automation & { tags: TagName[] }> {
    const automation = await this.automationRepo.findById(id);
    if (!automation) throw new ServiceError("automation not found", 404);
    const tags = (await this.tagRepo.getTagsForEntity("automation", id)).map((t) => t.kind);
    return { ...automation, tags };
  }

  async create(inputs: CreateAutomationInput[]): Promise<(Automation & { tags: TagName[] })[]> {
    for (const input of inputs) {
      if (!input.title?.trim()) {
        throw new ServiceError("title is required", 400);
      }
      if (input.title.length > 255) {
        throw new ServiceError("title must be 255 characters or fewer", 400);
      }
      if (input.summary !== undefined && input.summary.length > 1000) {
        throw new ServiceError("summary must be 1000 characters or fewer", 400);
      }
      if (input.prompt !== undefined && input.prompt.length > 100_000) {
        throw new ServiceError("prompt must be 100000 characters or fewer", 400);
      }
      if (input.agent !== undefined && input.agent.length > 255) {
        throw new ServiceError("agent must be 255 characters or fewer", 400);
      }
      if (input.category !== undefined && input.category.length > 64) {
        throw new ServiceError("category must be 64 characters or fewer", 400);
      }
      if (input.tags) {
        for (const tag of input.tags) {
          const normalized = tag.toLowerCase();
          if (!(TAG_NAMES as readonly string[]).includes(normalized)) {
            throw new ServiceError(`invalid tag "${tag}". Valid tags: ${TAG_NAMES.join(', ')}`, 400);
          }
        }
      }
    }

    const rows = inputs.map((input) => ({
      title: input.title,
      summary: input.summary ?? null,
      prompt: input.prompt ?? null,
      agent: input.agent ?? null,
      category: input.category ?? null,
      is_favorite: input.is_favorite ? 1 : 0,
    }));

    const automations = await this.automationRepo.insertMany(rows);

    for (let i = 0; i < automations.length; i++) {
      const input = inputs[i];
      if (input.tags && input.tags.length > 0) {
        const normalized = input.tags.map((t) => t.toLowerCase());
        await this.tagRepo.setTagsForEntity("automation", automations[i].id, normalized);
      }
    }

    const results: (Automation & { tags: TagName[] })[] = [];
    for (const automation of automations) {
      const tags = (await this.tagRepo.getTagsForEntity("automation", automation.id)).map((t) => t.kind);
      results.push({ ...automation, tags });
      await this.activityLog.insert({
        entity_type: "automation",
        entity_id: automation.id,
        action: "created",
        summary: JSON.stringify({ title: automation.title }),
      });
    }
    this.eventBus.emit({ type: "created", entity_type: "automation", ids: results.map((r) => r.id) });
    return results;
  }

  async update(inputs: UpdateAutomationInput[]): Promise<(Automation & { tags: TagName[] })[]> {
    for (const input of inputs) {
      if (input.title !== undefined && !input.title.trim()) {
        throw new ServiceError("title cannot be empty", 400);
      }
      if (input.title !== undefined && input.title.length > 255) {
        throw new ServiceError("title must be 255 characters or fewer", 400);
      }
      if (input.summary !== undefined && input.summary !== null && input.summary.length > 1000) {
        throw new ServiceError("summary must be 1000 characters or fewer", 400);
      }
      if (input.prompt !== undefined && input.prompt !== null && input.prompt.length > 100_000) {
        throw new ServiceError("prompt must be 100000 characters or fewer", 400);
      }
      if (input.agent !== undefined && input.agent !== null && input.agent.length > 255) {
        throw new ServiceError("agent must be 255 characters or fewer", 400);
      }
      if (input.category !== undefined && input.category !== null && input.category.length > 64) {
        throw new ServiceError("category must be 64 characters or fewer", 400);
      }
      if (input.tags) {
        for (const tag of input.tags) {
          const normalized = tag.toLowerCase();
          if (!(TAG_NAMES as readonly string[]).includes(normalized)) {
            throw new ServiceError(`invalid tag "${tag}". Valid tags: ${TAG_NAMES.join(', ')}`, 400);
          }
        }
      }
      const existing = await this.automationRepo.findById(input.id);
      if (!existing) throw new ServiceError(`automation not found: ${input.id}`, 404);
    }

    const repoInputs = inputs.map(({ tags, ...rest }) => rest);
    const automations = await this.automationRepo.updateMany(repoInputs);

    for (let i = 0; i < automations.length; i++) {
      const input = inputs[i];
      if (input.tags !== undefined) {
        const normalized = input.tags.map((t) => t.toLowerCase());
        await this.tagRepo.setTagsForEntity("automation", automations[i].id, normalized);
      }
    }

    const inputById = new Map(inputs.map(i => [i.id, i]));
    const results: (Automation & { tags: TagName[] })[] = [];
    for (const automation of automations) {
      const tags = (await this.tagRepo.getTagsForEntity("automation", automation.id)).map((t) => t.kind);
      results.push({ ...automation, tags });
      const fields = Object.keys(inputById.get(automation.id) ?? {}).filter((k) => k !== "id");
      await this.activityLog.insert({
        entity_type: "automation",
        entity_id: automation.id,
        action: "updated",
        summary: JSON.stringify({ fields }),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "automation", ids: results.map((r) => r.id) });
    return results;
  }

  async remove(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.tagRepo.removeTagsForEntity("automation", id);
    }
    await this.automationRepo.deleteMany(ids);
    for (const id of ids) {
      await this.activityLog.insert({
        entity_type: "automation",
        entity_id: id,
        action: "deleted",
        summary: JSON.stringify({}),
      });
    }
    this.eventBus.emit({ type: "deleted", entity_type: "automation", ids });
  }
}
