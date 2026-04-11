import type { Sql, Fragment } from "postgres";
import { ulid } from "ulid";
import type { Document, DocumentSummary, SemanticSearchResult, DocumentReferenceType } from "../../entities";

type DocumentFilter = {
  search?: string; title?: string; tag?: string; favorite?: boolean;
  folder?: string; doc_ids?: string[]; limit?: number; offset?: number;
};

export class PgDocumentRepository {
  constructor(private sql: Sql) {}

  async findById(id: string): Promise<Document | null> {
    const rows = await this.sql<Document[]>`SELECT * FROM documents WHERE id = ${id}`;
    return rows[0] ?? null;
  }

  async findMany(filter?: DocumentFilter): Promise<DocumentSummary[]> {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const { where, join } = this.buildFilter(filter);

    const rows = await this.sql<(Omit<DocumentSummary, "has_content" | "tags"> & { has_content: boolean })[]>`
      SELECT d.id, d.title, d.summary, (d.content IS NOT NULL) as has_content,
        d.folder, d.favorite, d.source_type, d.created_at, d.updated_at
      FROM documents d ${join} ${where}
      ORDER BY d.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    return rows.map((r) => ({
      ...r,
      folder: r.folder ?? null,
      source_type: r.source_type ?? null,
      tags: [] as string[],
      linked_projects: [],
    })) as DocumentSummary[];
  }

  async count(filter?: DocumentFilter): Promise<number> {
    const { where, join } = this.buildFilter(filter);
    const [row] = await this.sql<[{ total: string }]>`
      SELECT COUNT(*) as total FROM documents d ${join} ${where}
    `;
    return Number(row.total);
  }

  async insertMany(rows: { title: string; summary?: string | null; content?: string | null; folder?: string | null; favorite?: number | boolean; source_url?: string | null; source_type?: string | null; source_fetched_at?: string | null }[]): Promise<Document[]> {
    const now = new Date().toISOString();
    const results: Document[] = [];

    for (const row of rows) {
      const id = ulid();
      const favorite = !!(row.favorite);
      const source_url = row.source_url ?? null;
      const source_type = row.source_type ?? null;
      const source_fetched_at = row.source_fetched_at ?? null;
      await this.sql`
        INSERT INTO documents (id, title, summary, content, folder, favorite, source_url, source_type, source_fetched_at, created_at, updated_at)
        VALUES (${id}, ${row.title}, ${row.summary ?? null}, ${row.content ?? null}, ${row.folder ?? null}, ${favorite}, ${source_url}, ${source_type}, ${source_fetched_at}, ${now}, ${now})
      `;
      results.push({
        id, title: row.title, summary: row.summary ?? null,
        content: row.content ?? null, folder: row.folder ?? null,
        favorite, source_url, source_type: (source_type as Document['source_type']),
        source_fetched_at, created_at: now, updated_at: now,
      });
    }
    return results;
  }

  async updateMany(rows: { id: string; title?: string; summary?: string | null; content?: string | null; folder?: string | null; favorite?: boolean; source_url?: string | null; source_type?: string | null; source_fetched_at?: string | null }[]): Promise<Document[]> {
    const now = new Date().toISOString();
    const results: Document[] = [];

    for (const row of rows) {
      const existing = await this.findById(row.id);
      if (!existing) continue;

      const title = row.title !== undefined ? row.title : existing.title;
      const summary = row.summary !== undefined ? row.summary : existing.summary;
      const content = row.content !== undefined ? row.content : existing.content;
      const folder = row.folder !== undefined ? row.folder : existing.folder;
      const favorite = row.favorite !== undefined ? row.favorite : existing.favorite;
      const source_url = row.source_url !== undefined ? row.source_url : existing.source_url;
      const source_type = row.source_type !== undefined ? row.source_type : existing.source_type;
      const source_fetched_at = row.source_fetched_at !== undefined ? row.source_fetched_at : existing.source_fetched_at;

      await this.sql`
        UPDATE documents SET title = ${title}, summary = ${summary}, content = ${content},
          folder = ${folder}, favorite = ${favorite}, source_url = ${source_url},
          source_type = ${source_type}, source_fetched_at = ${source_fetched_at}, updated_at = ${now}
        WHERE id = ${row.id}
      `;
      results.push({ id: row.id, title, summary, content, folder, favorite, source_url, source_type: (source_type as Document['source_type']), source_fetched_at, created_at: existing.created_at, updated_at: now });
    }
    return results;
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.sql`DELETE FROM documents WHERE id IN ${this.sql(ids)}`;
  }

  async semanticSearch(queryEmbedding: number[], filter?: { tag?: string; folder?: string; favorite?: boolean; limit?: number }): Promise<SemanticSearchResult[]> {
    const limit = filter?.limit ?? 20;
    const MIN_SIMILARITY = 0.4;
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    const conditions: Fragment[] = [
      this.sql`d.embedding IS NOT NULL`,
      this.sql`1 - (d.embedding <=> ${vectorStr}::vector) >= ${MIN_SIMILARITY}`,
    ];
    let join: Fragment = this.sql``;

    if (filter?.tag) {
      join = this.sql`JOIN entity_tags et ON et.entity_type = 'document' AND et.entity_id = d.id JOIN tags t ON t.id = et.tag_id`;
      conditions.push(this.sql`t.kind = ${filter.tag}`);
    }
    if (filter?.folder) {
      conditions.push(this.sql`d.folder = ${filter.folder}`);
    }
    if (filter?.favorite !== undefined) {
      conditions.push(this.sql`d.favorite = ${filter.favorite}`);
    }

    const where = this.sql`WHERE ${conditions.reduce((a, b) => this.sql`${a} AND ${b}`)}`;

    // Fetch documents ranked by cosine similarity
    const docs = await this.sql<{ id: string; title: string; summary: string | null; folder: string | null; favorite: boolean; has_content: boolean; created_at: string; updated_at: string; similarity: string }[]>`
      SELECT d.id, d.title, d.summary, d.folder, d.favorite,
        (d.content IS NOT NULL AND d.content <> '') as has_content,
        d.created_at, d.updated_at,
        1 - (d.embedding <=> ${vectorStr}::vector) as similarity
      FROM documents d ${join} ${where}
      ORDER BY d.embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;

    if (docs.length === 0) return [];

    // Batch-fetch references for all matched documents
    const docIds = docs.map((d) => d.id);
    const refs = await this.sql<{ document_id: string; entity_type: string; entity_id: string; type: DocumentReferenceType }[]>`
      SELECT document_id, entity_type, entity_id, type
      FROM document_references
      WHERE document_id IN ${this.sql(docIds)}
      ORDER BY entity_type, entity_id
    `;

    const refMap = new Map<string, { entity_type: string; entity_id: string; type: DocumentReferenceType }[]>();
    for (const ref of refs) {
      let list = refMap.get(ref.document_id);
      if (!list) { list = []; refMap.set(ref.document_id, list); }
      list.push({ entity_type: ref.entity_type, entity_id: ref.entity_id, type: ref.type });
    }

    return docs.map((d) => ({
      document_id: d.id,
      title: d.title,
      summary: d.summary,
      folder: d.folder,
      favorite: d.favorite,
      has_content: Boolean(d.has_content),
      tags: [],
      linked_projects: [],
      created_at: d.created_at,
      updated_at: d.updated_at,
      similarity: Number(d.similarity),
      references: refMap.get(d.id) ?? [],
    }));
  }

  private buildFilter(filter?: DocumentFilter): { where: Fragment; join: Fragment } {
    const conditions: Fragment[] = [];
    let join: Fragment = this.sql``;

    if (filter?.search) {
      conditions.push(this.sql`(d.title ILIKE ${"%" + filter.search + "%"} OR d.summary ILIKE ${"%" + filter.search + "%"})`);
    }
    if (filter?.title) {
      conditions.push(this.sql`d.title ILIKE ${"%" + filter.title + "%"}`);
    }
    if (filter?.tag) {
      join = this.sql`JOIN entity_tags et ON et.entity_type = 'document' AND et.entity_id = d.id JOIN tags t ON t.id = et.tag_id`;
      conditions.push(this.sql`t.kind = ${filter.tag}`);
    }
    if (filter?.favorite !== undefined) {
      conditions.push(this.sql`d.favorite = ${filter.favorite}`);
    }
    if (filter?.folder) {
      conditions.push(this.sql`d.folder = ${filter.folder}`);
    }
    if (filter?.doc_ids && filter.doc_ids.length > 0) {
      conditions.push(this.sql`d.id IN ${this.sql(filter.doc_ids)}`);
    }

    const where = conditions.length > 0
      ? this.sql`WHERE ${conditions.reduce((a, b) => this.sql`${a} AND ${b}`)}`
      : this.sql``;

    return { where, join };
  }
}
