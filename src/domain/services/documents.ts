import { type Document, type DocumentSummary, type TagName, TAG_NAMES, toDocumentSummary } from "../entities";
import type { CreateDocumentInput, UpdateDocumentInput } from "../inputs";
import type { IDocumentService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { DocumentRepository } from "../repositories/documents";
import type { TagRepository } from "../repositories/tags";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";

export class DocumentService implements IDocumentService {
  constructor(
    private documentRepo: DocumentRepository,
    private tagRepo: TagRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
  ) {}

  list(filter?: { title?: string; tag?: string; limit?: number; offset?: number }): Paginated<DocumentSummary> {
    const summaries = this.documentRepo.findMany(filter);
    const data = summaries.map((s) => {
      const tags = this.tagRepo.getTagsForEntity("document", s.id).map((t) => t.kind);
      return { ...s, tags };
    });
    return {
      data,
      total: this.documentRepo.count(filter),
    };
  }

  get(id: string): Document & { tags: string[] } {
    const doc = this.documentRepo.findById(id);
    if (!doc) throw new ServiceError("document not found", 404);
    const tags = this.tagRepo.getTagsForEntity("document", id).map((t) => t.kind);
    return { ...doc, tags };
  }

  create(inputs: CreateDocumentInput[]): (Document & { tags: string[] })[] {
    for (const input of inputs) {
      if (!input.title?.trim()) {
        throw new ServiceError("title is required", 400);
      }
      if (input.title.length > 255) {
        throw new ServiceError("title must be 255 characters or fewer", 400);
      }
      if (input.content !== undefined && input.content.length > 50000) {
        throw new ServiceError("content must be 50000 characters or fewer", 400);
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
      content: input.content ?? null,
    }));

    const documents = this.documentRepo.insertMany(rows);

    for (let i = 0; i < documents.length; i++) {
      const input = inputs[i];
      if (input.tags && input.tags.length > 0) {
        const normalized = input.tags.map((t) => t.toLowerCase());
        this.tagRepo.setTagsForEntity("document", documents[i].id, normalized);
      }
    }

    const results: (Document & { tags: string[] })[] = [];
    for (const doc of documents) {
      const tags = this.tagRepo.getTagsForEntity("document", doc.id).map((t) => t.kind);
      results.push({ ...doc, tags });
      this.activityLog.insert({
        entity_type: "document",
        entity_id: doc.id,
        action: "created",
        summary: JSON.stringify({ title: doc.title }),
      });
    }
    this.eventBus.emit({ type: "created", entity_type: "document", payload: results });
    return results;
  }

  update(inputs: UpdateDocumentInput[]): (Document & { tags: string[] })[] {
    for (const input of inputs) {
      if (input.title !== undefined && !input.title.trim()) {
        throw new ServiceError("title cannot be empty", 400);
      }
      if (input.title !== undefined && input.title.length > 255) {
        throw new ServiceError("title must be 255 characters or fewer", 400);
      }
      if (input.content !== undefined && input.content !== null && input.content.length > 50000) {
        throw new ServiceError("content must be 50000 characters or fewer", 400);
      }
      if (input.tags) {
        for (const tag of input.tags) {
          const normalized = tag.toLowerCase();
          if (!(TAG_NAMES as readonly string[]).includes(normalized)) {
            throw new ServiceError(`invalid tag "${tag}". Valid tags: ${TAG_NAMES.join(', ')}`, 400);
          }
        }
      }
      const existing = this.documentRepo.findById(input.id);
      if (!existing) throw new ServiceError(`document not found: ${input.id}`, 404);
    }

    const repoInputs = inputs.map(({ tags, ...rest }) => rest);
    const documents = this.documentRepo.updateMany(repoInputs);

    for (let i = 0; i < documents.length; i++) {
      const input = inputs[i];
      if (input.tags !== undefined) {
        const normalized = input.tags.map((t) => t.toLowerCase());
        this.tagRepo.setTagsForEntity("document", documents[i].id, normalized);
      }
    }

    const results: (Document & { tags: string[] })[] = [];
    for (const doc of documents) {
      const tags = this.tagRepo.getTagsForEntity("document", doc.id).map((t) => t.kind);
      results.push({ ...doc, tags });
      const fields = Object.keys(inputs.find((i) => i.id === doc.id) ?? {}).filter((k) => k !== "id");
      this.activityLog.insert({
        entity_type: "document",
        entity_id: doc.id,
        action: "updated",
        summary: JSON.stringify({ fields }),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "document", payload: results });
    return results;
  }

  remove(ids: string[]): void {
    for (const id of ids) {
      this.tagRepo.removeTagsForEntity("document", id);
    }
    this.documentRepo.deleteMany(ids);
    for (const id of ids) {
      this.activityLog.insert({
        entity_type: "document",
        entity_id: id,
        action: "deleted",
        summary: JSON.stringify({}),
      });
    }
    this.eventBus.emit({ type: "deleted", entity_type: "document", ids });
  }
}
