import { type Document, type TagName, TAG_NAMES, SOURCE_TYPES } from "../entities";
import type { ImportDocumentInput } from "../inputs";
import type { ISourceService } from "../services";
import { ServiceError } from "../errors";
import type { IDocumentRepository, ITagRepository, IActivityLogRepository } from "../repositories/interfaces";
import type { EventBus } from "../events";
import type { ConnectorRegistry } from "../connectors/registry";
import type { TreeEntry } from "../connectors/types";

/** Allows path segments separated by `/`. Each segment: lowercase alphanumeric, hyphens, dots, underscores. */
const FOLDER_PATTERN = /^[a-z0-9._][a-z0-9._-]*(\/[a-z0-9._][a-z0-9._-]*)*$/;

function normalizeFolder(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim().toLowerCase().replace(/\/+/g, "/").replace(/\/$/, "");
  return trimmed === "" ? null : trimmed;
}

export class SourceService implements ISourceService {
  constructor(
    private documentRepo: IDocumentRepository,
    private tagRepo: ITagRepository,
    private activityLog: IActivityLogRepository,
    private eventBus: EventBus,
    private connectorRegistry: ConnectorRegistry,
  ) {}

  async import(input: ImportDocumentInput): Promise<Document & { tags: string[] }> {
    const url = input.url?.trim();
    if (!url) throw new ServiceError("url is required", 400);

    const connector = this.connectorRegistry.resolve(url);
    if (!connector) throw new ServiceError(`No connector found for URL: ${url}`, 400);

    if (!(SOURCE_TYPES as readonly string[]).includes(connector.type)) {
      throw new ServiceError(`Unknown source type: ${connector.type}`, 400);
    }

    // Validate optional fields
    const folder = normalizeFolder(input.folder);
    if (folder !== null && (folder.length > 255 || !FOLDER_PATTERN.test(folder))) {
      throw new ServiceError("folder must be lowercase alphanumeric, hyphens, dots, underscores, and forward slashes, max 255 chars", 400);
    }
    if (input.tags) {
      for (const tag of input.tags) {
        if (!(TAG_NAMES as readonly string[]).includes(tag.toLowerCase())) {
          throw new ServiceError(`invalid tag "${tag}". Valid tags: ${TAG_NAMES.join(', ')}`, 400);
        }
      }
    }

    // Fetch content from external source
    let result;
    try {
      result = await connector.fetch(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceError(`Failed to fetch from source: ${msg}`, 502);
    }

    const effectiveFolder = folder;

    const now = new Date().toISOString();
    const [doc] = await this.documentRepo.insertMany([{
      title: result.title,
      summary: result.summary ?? null,
      content: result.content,
      folder: effectiveFolder,
      favorite: input.favorite ? 1 : 0,
      source_url: url,
      source_type: connector.type,
      source_fetched_at: now,
    }]);

    // Apply tags
    if (input.tags && input.tags.length > 0) {
      const normalized = input.tags.map(t => t.toLowerCase());
      await this.tagRepo.setTagsForEntity("document", doc.id, normalized);
    }

    const tags = (await this.tagRepo.getTagsForEntity("document", doc.id)).map(t => t.kind);

    await this.activityLog.insert({
      entity_type: "document",
      entity_id: doc.id,
      action: "created",
      summary: JSON.stringify({ title: doc.title, source_type: connector.type, source_url: url }),
    });

    this.eventBus.emit({ type: "created", entity_type: "document", ids: [doc.id] });
    return { ...doc, tags };
  }

  async refresh(documentId: string): Promise<Document & { tags: string[] }> {
    const existing = await this.documentRepo.findById(documentId);
    if (!existing) throw new ServiceError("document not found", 404);
    if (!existing.source_type || !existing.source_url) {
      throw new ServiceError("document has no external source", 400);
    }

    const connector = this.connectorRegistry.get(existing.source_type);
    if (!connector) {
      throw new ServiceError(`No connector found for source type: ${existing.source_type}`, 400);
    }

    let result;
    try {
      result = await connector.fetch(existing.source_url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceError(`Failed to refresh from source: ${msg}`, 502);
    }

    const now = new Date().toISOString();
    const [updated] = await this.documentRepo.updateMany([{
      id: documentId,
      content: result.content,
      source_fetched_at: now,
    }]);

    const tags = (await this.tagRepo.getTagsForEntity("document", updated.id)).map(t => t.kind);

    await this.activityLog.insert({
      entity_type: "document",
      entity_id: updated.id,
      action: "updated",
      summary: JSON.stringify({ fields: ["content", "source_fetched_at"], source_type: existing.source_type }),
    });

    this.eventBus.emit({ type: "updated", entity_type: "document", ids: [updated.id] });
    return { ...updated, tags };
  }

  async browseRepo(repoUrl: string, query?: string): Promise<TreeEntry[]> {
    // Find a connector that supports tree listing
    const connector = this.connectorRegistry.resolve(repoUrl) ?? this.connectorRegistry.get('github');
    if (!connector?.listTree) {
      throw new ServiceError("No connector supports browsing for this URL", 400);
    }

    let entries: TreeEntry[];
    try {
      entries = await connector.listTree(repoUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ServiceError(`Failed to browse repo: ${msg}`, 502);
    }

    // Filter by query (case-insensitive path match)
    if (query?.trim()) {
      const q = query.trim().toLowerCase();
      entries = entries.filter(e => e.path.toLowerCase().includes(q));
    }

    return entries;
  }

  async importBatch(inputs: ImportDocumentInput[]): Promise<(Document & { tags: string[] })[]> {
    const results: (Document & { tags: string[] })[] = [];
    for (const input of inputs) {
      results.push(await this.import(input));
    }
    return results;
  }
}
