import { type Document, type DocumentSummary, type TagName, TAG_NAMES, toDocumentSummary } from "../entities";
import type { CreateDocumentInput, UpdateDocumentInput } from "../inputs";
import type { IDocumentService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { DocumentRepository } from "../repositories/documents";
import type { TagRepository } from "../repositories/tags";
import type { DocumentReferenceRepository } from "../repositories/document-references";
import type { ActivityLogRepository } from "../repositories/activity-log";
import type { EventBus } from "../events";

const FOLDER_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function normalizeFolder(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed === "" ? null : trimmed;
}

function isValidFolder(value: string): boolean {
  return value.length <= 64 && FOLDER_PATTERN.test(value);
}

export class DocumentService implements IDocumentService {
  constructor(
    private documentRepo: DocumentRepository,
    private tagRepo: TagRepository,
    private activityLog: ActivityLogRepository,
    private eventBus: EventBus,
    private docRefRepo?: DocumentReferenceRepository,
  ) {}

  list(filter?: { search?: string; title?: string; tag?: string; favorite?: boolean; folder?: string; entity_type?: string; entity_id?: string; limit?: number; offset?: number }): Paginated<DocumentSummary> {
    let docIds: string[] | undefined;
    const entityType = filter?.entity_type;
    const entityId = filter?.entity_id;
    if (entityType && entityId && this.docRefRepo) {
      const refs = this.docRefRepo.getReferencesForEntity(entityType, entityId);
      docIds = [...new Set(refs.map((r) => r.document_id))];
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

  get(id: string): Document & { tags: string[]; referenced_by: { entity_type: string; entity_id: string; entity_title: string; type: string }[] } {
    const doc = this.documentRepo.findById(id);
    if (!doc) throw new ServiceError("document not found", 404);
    const tags = this.tagRepo.getTagsForEntity("document", id).map((t) => t.kind);
    const referenced_by = this.docRefRepo
      ? this.docRefRepo.getEntitiesForDocumentWithTitles(id)
      : [];
    return { ...doc, tags, referenced_by };
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
      if (input.folder !== undefined) {
        input.folder = normalizeFolder(input.folder);
        if (input.folder !== null && !isValidFolder(input.folder)) {
          throw new ServiceError("folder must be lowercase alphanumeric and hyphens, max 64 chars", 400);
        }
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
      folder: input.folder ?? null,
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
    this.eventBus.emit({ type: "created", entity_type: "document", ids: results.map((r) => r.id) });
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
      if (input.folder !== undefined) {
        input.folder = normalizeFolder(input.folder);
        if (input.folder !== null && !isValidFolder(input.folder)) {
          throw new ServiceError("folder must be lowercase alphanumeric and hyphens, max 64 chars", 400);
        }
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
    this.eventBus.emit({ type: "updated", entity_type: "document", ids: results.map((r) => r.id) });
    return results;
  }

  remove(ids: string[]): void {
    for (const id of ids) {
      this.docRefRepo?.removeAllForDocument(id);
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
