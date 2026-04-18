import { type Document, type DocumentSummary, type SemanticSearchResult, TAG_NAMES } from "../entities";
import type { CreateDocumentInput, UpdateDocumentInput } from "../inputs";
import type { IDocumentService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { IDocumentRepository, ITagRepository, IProjectDocumentRepository, IActivityLogRepository } from "../repositories/interfaces";
import type { EventBus } from "../events";
import type { EmbeddingService } from "../embedding";

/** Allows path segments separated by `/`. Each segment: lowercase alphanumeric, hyphens, dots, underscores. */
const FOLDER_PATTERN = /^[a-z0-9._][a-z0-9._-]*(\/[a-z0-9._][a-z0-9._-]*)*$/;

function normalizeFolder(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim().toLowerCase().replace(/\/+/g, "/").replace(/\/$/, "");
  return trimmed === "" ? null : trimmed;
}

function isValidFolder(value: string): boolean {
  return value.length <= 255 && FOLDER_PATTERN.test(value);
}

export class DocumentService implements IDocumentService {
  constructor(
    private documentRepo: IDocumentRepository,
    private tagRepo: ITagRepository,
    private activityLog: IActivityLogRepository,
    private eventBus: EventBus,
    private projectDocRepo?: IProjectDocumentRepository,
    private embeddingService?: EmbeddingService,
  ) {}

  async list(filter?: { search?: string; title?: string; tag?: string; favorite?: boolean; folder?: string; project_id?: string; limit?: number; offset?: number }): Promise<Paginated<DocumentSummary>> {
    let docIds: string[] | undefined;
    const projectId = filter?.project_id;
    if (projectId && this.projectDocRepo) {
      const refs = await this.projectDocRepo.findByProject(projectId);
      docIds = refs.map((r) => r.document_id);
      if (docIds.length === 0) return { data: [], total: 0 };
    }

    const { project_id, ...rest } = filter ?? {};
    const repoFilter = { ...rest, doc_ids: docIds };
    const summaries = await this.documentRepo.findMany(repoFilter);
    const ids = summaries.map((s) => s.id);
    const tagMap = await this.tagRepo.getTagsForEntities("document", ids);
    const projectMap = this.projectDocRepo
      ? await this.projectDocRepo.getProjectsForDocuments(ids)
      : new Map<string, { id: string; title: string }[]>();
    const data = summaries.map((s) => ({
      ...s,
      tags: tagMap.get(s.id) ?? [],
      linked_projects: projectMap.get(s.id) ?? [],
    }));
    return {
      data,
      total: await this.documentRepo.count(repoFilter),
    };
  }

  async get(id: string): Promise<Document & { tags: string[]; linked_projects: { id: string; title: string }[] }> {
    const doc = await this.documentRepo.findById(id);
    if (!doc) throw new ServiceError("document not found", 404);
    const tags = (await this.tagRepo.getTagsForEntity("document", id)).map((t) => t.kind);
    const linked_projects = this.projectDocRepo
      ? (await this.projectDocRepo.getProjectsForDocuments([id])).get(id) ?? []
      : [];
    return { ...doc, tags, linked_projects };
  }

  async create(inputs: CreateDocumentInput[]): Promise<(Document & { tags: string[] })[]> {
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
        const normalizedFolder = normalizeFolder(input.folder);
        input.folder = normalizedFolder ?? undefined;
        if (normalizedFolder !== null && !isValidFolder(normalizedFolder)) {
          throw new ServiceError("folder must be lowercase alphanumeric, hyphens, dots, underscores, and forward slashes, max 255 chars", 400);
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

    const documents = await this.documentRepo.insertMany(rows);

    for (let i = 0; i < documents.length; i++) {
      const input = inputs[i];
      if (input.tags && input.tags.length > 0) {
        const normalized = input.tags.map((t) => t.toLowerCase());
        await this.tagRepo.setTagsForEntity("document", documents[i].id, normalized);
      }
    }

    const results: (Document & { tags: string[] })[] = [];
    for (const doc of documents) {
      const tags = (await this.tagRepo.getTagsForEntity("document", doc.id)).map((t) => t.kind);
      results.push({ ...doc, tags });
      await this.activityLog.insert({
        entity_type: "document",
        entity_id: doc.id,
        action: "created",
        summary: JSON.stringify({ title: doc.title }),
      });
    }
    this.eventBus.emit({ type: "created", entity_type: "document", ids: results.map((r) => r.id) });
    return results;
  }

  async update(inputs: UpdateDocumentInput[]): Promise<(Document & { tags: string[] })[]> {
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
        const normalizedFolder = normalizeFolder(input.folder);
        input.folder = normalizedFolder;
        if (normalizedFolder !== null && !isValidFolder(normalizedFolder)) {
          throw new ServiceError("folder must be lowercase alphanumeric, hyphens, dots, underscores, and forward slashes, max 255 chars", 400);
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
      const existing = await this.documentRepo.findById(input.id);
      if (!existing) throw new ServiceError(`document not found: ${input.id}`, 404);
    }

    const repoInputs = inputs.map(({ tags, ...rest }) => rest);
    const documents = await this.documentRepo.updateMany(repoInputs);

    for (let i = 0; i < documents.length; i++) {
      const input = inputs[i];
      if (input.tags !== undefined) {
        const normalized = input.tags.map((t) => t.toLowerCase());
        await this.tagRepo.setTagsForEntity("document", documents[i].id, normalized);
      }
    }

    const inputById = new Map(inputs.map(i => [i.id, i]));
    const results: (Document & { tags: string[] })[] = [];
    for (const doc of documents) {
      const tags = (await this.tagRepo.getTagsForEntity("document", doc.id)).map((t) => t.kind);
      results.push({ ...doc, tags });
      const fields = Object.keys(inputById.get(doc.id) ?? {}).filter((k) => k !== "id");
      await this.activityLog.insert({
        entity_type: "document",
        entity_id: doc.id,
        action: "updated",
        summary: JSON.stringify({ fields }),
      });
    }
    this.eventBus.emit({ type: "updated", entity_type: "document", ids: results.map((r) => r.id) });
    return results;
  }

  async removeByFolder(folder: string): Promise<void> {
    const ids = await this.documentRepo.findIdsByFolder(folder);
    if (ids.length === 0) return;
    await this.remove(ids);
  }

  async remove(ids: string[]): Promise<void> {
    for (const id of ids) {
      if (this.projectDocRepo) await this.projectDocRepo.removeAllForDocument(id);
      await this.tagRepo.removeTagsForEntity("document", id);
    }
    await this.documentRepo.deleteMany(ids);
    for (const id of ids) {
      await this.activityLog.insert({
        entity_type: "document",
        entity_id: id,
        action: "deleted",
        summary: JSON.stringify({}),
      });
    }
    this.eventBus.emit({ type: "deleted", entity_type: "document", ids });
  }

  async semanticSearch(query: string, filter?: { tag?: string; folder?: string; favorite?: boolean; limit?: number }): Promise<SemanticSearchResult[]> {
    if (!query.trim()) return [];

    if (!this.embeddingService || !this.documentRepo.semanticSearch) return [];

    const queryEmbedding = await this.embeddingService.embedQuery(query);
    if (!queryEmbedding) return [];

    const results = await this.documentRepo.semanticSearch(queryEmbedding, { ...filter, queryText: query });
    if (results.length === 0) return results;

    const ids = results.map((r) => r.document_id);
    const tagMap = await this.tagRepo.getTagsForEntities("document", ids);
    const projectMap = this.projectDocRepo
      ? await this.projectDocRepo.getProjectsForDocuments(ids)
      : new Map<string, { id: string; title: string }[]>();

    return results.map((r) => ({
      ...r,
      tags: tagMap.get(r.document_id) ?? [],
      linked_projects: projectMap.get(r.document_id) ?? [],
    }));
  }
}
