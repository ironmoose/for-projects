import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Document, DocumentSummary } from "../../entities";

export interface DocumentRow {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  folder: string | null;
  favorite: number;
  source_url: string | null;
  source_type: string | null;
  source_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

function toDocument(row: DocumentRow): Document {
  return {
    ...row,
    favorite: !!row.favorite,
    folder: row.folder ?? null,
    source_url: row.source_url ?? null,
    source_type: (row.source_type as Document['source_type']) ?? null,
    source_fetched_at: row.source_fetched_at ?? null,
  };
}

export class DocumentRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Document | null> {
    const row = this.db.query("SELECT * FROM documents WHERE id = ?").get(id) as DocumentRow | null;
    return row ? toDocument(row) : null;
  }

  async findMany(filter?: { search?: string; title?: string; tag?: string; favorite?: boolean; folder?: string; doc_ids?: string[]; limit?: number; offset?: number }): Promise<DocumentSummary[]> {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let join = "";

    if (filter?.search) {
      conditions.push("(d.title LIKE ? OR d.summary LIKE ?)");
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }
    if (filter?.title) {
      conditions.push("d.title LIKE ?");
      params.push(`%${filter.title}%`);
    }
    if (filter?.tag) {
      join = " JOIN entity_tags et ON et.entity_type = 'document' AND et.entity_id = d.id JOIN tags t ON t.id = et.tag_id";
      conditions.push("t.kind = ?");
      params.push(filter.tag);
    }
    if (filter?.favorite !== undefined) {
      conditions.push("d.favorite = ?");
      params.push(filter.favorite ? 1 : 0);
    }
    if (filter?.folder) {
      conditions.push("d.folder = ?");
      params.push(filter.folder);
    }
    if (filter?.doc_ids) {
      const placeholders = filter.doc_ids.map(() => "?").join(", ");
      conditions.push(`d.id IN (${placeholders})`);
      params.push(...filter.doc_ids);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    const rows = this.db
      .query(`SELECT d.id, d.title, d.summary, (d.content IS NOT NULL) as has_content, d.folder, d.favorite, d.source_type, d.created_at, d.updated_at FROM documents d${join} ${where}ORDER BY d.created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as (Omit<DocumentSummary, "has_content" | "favorite" | "tags"> & { has_content: number; favorite: number })[];
    return rows.map((r) => ({ ...r, has_content: !!r.has_content, folder: r.folder ?? null, favorite: !!r.favorite, source_type: r.source_type ?? null, tags: [] as string[] })) as DocumentSummary[];
  }

  async count(filter?: { search?: string; title?: string; tag?: string; favorite?: boolean; folder?: string; doc_ids?: string[] }): Promise<number> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let join = "";

    if (filter?.search) {
      conditions.push("(d.title LIKE ? OR d.summary LIKE ?)");
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }
    if (filter?.title) {
      conditions.push("d.title LIKE ?");
      params.push(`%${filter.title}%`);
    }
    if (filter?.tag) {
      join = " JOIN entity_tags et ON et.entity_type = 'document' AND et.entity_id = d.id JOIN tags t ON t.id = et.tag_id";
      conditions.push("t.kind = ?");
      params.push(filter.tag);
    }
    if (filter?.favorite !== undefined) {
      conditions.push("d.favorite = ?");
      params.push(filter.favorite ? 1 : 0);
    }
    if (filter?.folder) {
      conditions.push("d.folder = ?");
      params.push(filter.folder);
    }
    if (filter?.doc_ids) {
      const placeholders = filter.doc_ids.map(() => "?").join(", ");
      conditions.push(`d.id IN (${placeholders})`);
      params.push(...filter.doc_ids);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM documents d${join} ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  async insertMany(rows: Omit<DocumentRow, "id" | "created_at" | "updated_at">[]): Promise<Document[]> {
    const stmt = this.db.query(
      "INSERT INTO documents (id, title, summary, content, folder, favorite, source_url, source_type, source_fetched_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.title, row.summary ?? null, row.content ?? null, row.folder ?? null, row.favorite ?? 0, row.source_url ?? null, row.source_type ?? null, row.source_fetched_at ?? null, now, now);
    }

    const results: Document[] = [];
    for (let i = 0; i < rows.length; i++) {
      results.push({
        id: ids[i],
        title: rows[i].title,
        summary: rows[i].summary ?? null,
        content: rows[i].content ?? null,
        folder: rows[i].folder ?? null,
        favorite: !!rows[i].favorite,
        source_url: rows[i].source_url ?? null,
        source_type: (rows[i].source_type as Document['source_type']) ?? null,
        source_fetched_at: rows[i].source_fetched_at ?? null,
        created_at: now,
        updated_at: now,
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
      const favorite = row.favorite !== undefined ? (row.favorite ? 1 : 0) : (existing.favorite ? 1 : 0);
      const source_url = row.source_url !== undefined ? row.source_url : existing.source_url;
      const source_type = row.source_type !== undefined ? row.source_type : existing.source_type;
      const source_fetched_at = row.source_fetched_at !== undefined ? row.source_fetched_at : existing.source_fetched_at;

      this.db
        .query("UPDATE documents SET title = ?, summary = ?, content = ?, folder = ?, favorite = ?, source_url = ?, source_type = ?, source_fetched_at = ?, updated_at = ? WHERE id = ?")
        .run(title, summary, content, folder, favorite, source_url, source_type, source_fetched_at, now, row.id);

      results.push({
        id: row.id,
        title,
        summary,
        content,
        folder,
        favorite: !!favorite,
        source_url,
        source_type: (source_type as Document['source_type']) ?? null,
        source_fetched_at,
        created_at: existing.created_at,
        updated_at: now,
      });
    }

    return results;
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM documents WHERE id IN (${placeholders})`).run(...ids);
  }
}
