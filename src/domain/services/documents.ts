import { type Document, type DocumentSummary, type TagName, TAG_NAMES, toDocumentSummary } from "../entities";
import type { CreateDocumentInput, UpdateDocumentInput } from "../inputs";
import type { IDocumentService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { DocumentRepository } from "../repositories/documents";
import type { TagRepository } from "../repositories/tags";
import type { ProjectDocumentRepository } from "../repositories/project-documents";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";

export class DocumentService implements IDocumentService {
  constructor(
    private documentRepo: DocumentRepository,
    private tagRepo: TagRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
    private projectDocumentRepo?: ProjectDocumentRepository,
  ) {}

  list(filter?: { title?: string; tag?: string; favorite?: boolean; project_id?: string; limit?: number; offset?: number }): Paginated<DocumentSummary> {
    // If filtering by project_id, get linked doc IDs first and intersect
    let docIds: string[] | undefined;
    if (filter?.project_id && this.projectDocumentRepo) {
      const linked = this.projectDocumentRepo.getDocumentsForProject(filter.project_id);
      docIds = linked.map((d) => d.id);
      if (docIds.length === 0) return { data: [], total: 0 };
    }

    const repoFilter = { ...filter, doc_ids: docIds };
    const summaries = this.documentRepo.findMany(repoFilter);
    const tagMap = this.tagRepo.getTagsForEntities("document", summaries.map((s) => s.id));
    const data = summaries.map((s) => ({ ...s, tags: tagMap.get(s.id) ?? [] }));
    return {
      data,
      total: this.documentRepo.count(repoFilter),
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
      if (input.summary !== undefined && input.summary.length > 500) {
        throw new ServiceError("summary must be 500 characters or fewer", 400);
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
      summary: input.summary ?? null,
      content: input.content ?? null,
      favorite: input.favorite ? 1 : 0,
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
      if (input.summary !== undefined && input.summary !== null && input.summary.length > 500) {
        throw new ServiceError("summary must be 500 characters or fewer", 400);
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
