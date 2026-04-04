import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Document, DocumentSummary } from "../entities";

export interface DocumentRow {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  favorite: number;
  created_at: string;
  updated_at: string;
}

function toDocument(row: DocumentRow): Document {
  return { ...row, favorite: !!row.favorite };
}

export class DocumentRepository {
  constructor(private db: Database) {}

  findById(id: string): Document | null {
    const row = this.db.query("SELECT * FROM documents WHERE id = ?").get(id) as DocumentRow | null;
    return row ? toDocument(row) : null;
  }

  findMany(filter?: { search?: string; title?: string; tag?: string; favorite?: boolean; doc_ids?: string[]; limit?: number; offset?: number }): DocumentSummary[] {
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
    if (filter?.doc_ids) {
      const placeholders = filter.doc_ids.map(() => "?").join(", ");
      conditions.push(`d.id IN (${placeholders})`);
      params.push(...filter.doc_ids);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    const rows = this.db
      .query(`SELECT d.id, d.title, d.summary, (d.content IS NOT NULL) as has_content, d.favorite, d.created_at, d.updated_at FROM documents d${join} ${where}ORDER BY d.created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as (Omit<DocumentSummary, "has_content" | "favorite" | "tags"> & { has_content: number; favorite: number })[];
    return rows.map((r) => ({ ...r, has_content: !!r.has_content, favorite: !!r.favorite, tags: [] as string[] })) as DocumentSummary[];
  }

  count(filter?: { search?: string; title?: string; tag?: string; favorite?: boolean; doc_ids?: string[] }): number {
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

  insertMany(rows: Omit<DocumentRow, "id" | "created_at" | "updated_at">[]): Document[] {
    const stmt = this.db.query(
      "INSERT INTO documents (id, title, summary, content, favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.title, row.summary ?? null, row.content ?? null, row.favorite ?? 0, now, now);
    }

    return ids.map((id) => this.findById(id)!);
  }

  updateMany(rows: { id: string; title?: string; summary?: string | null; content?: string | null; favorite?: boolean }[]): Document[] {
    const now = new Date().toISOString();
    const results: Document[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const title = row.title !== undefined ? row.title : existing.title;
      const summary = row.summary !== undefined ? row.summary : existing.summary;
      const content = row.content !== undefined ? row.content : existing.content;
      const favorite = row.favorite !== undefined ? (row.favorite ? 1 : 0) : (existing.favorite ? 1 : 0);

      this.db
        .query("UPDATE documents SET title = ?, summary = ?, content = ?, favorite = ?, updated_at = ? WHERE id = ?")
        .run(title, summary, content, favorite, now, row.id);

      results.push(this.findById(row.id)!);
    }

    return results;
  }

  deleteMany(ids: string[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM documents WHERE id IN (${placeholders})`).run(...ids);
  }
}
