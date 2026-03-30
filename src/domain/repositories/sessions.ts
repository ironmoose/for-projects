import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Session } from "../entities";

export interface SessionRow {
  id: string;
  project_id: string;
  summary: string | null;
  started_at: string;
  finished_at: string | null;
}

export class SessionRepository {
  constructor(private db: Database) {}

  findById(id: string): Session | null {
    return this.db.query("SELECT * FROM sessions WHERE id = ?").get(id) as Session | null;
  }

  findMany(filter?: {
    id?: string;
    limit?: number;
    offset?: number;
    project_id?: string;
  }): Session[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.project_id) {
      conditions.push("project_id = ?");
      params.push(filter.project_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    return this.db
      .query(`SELECT * FROM sessions ${where}ORDER BY started_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as Session[];
  }

  count(filter?: { id?: string; project_id?: string }): number {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.project_id) {
      conditions.push("project_id = ?");
      params.push(filter.project_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM sessions ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  insertMany(rows: Omit<SessionRow, "id">[]): Session[] {
    const stmt = this.db.query(
      "INSERT INTO sessions (id, project_id, summary, started_at, finished_at) VALUES (?, ?, ?, ?, ?)"
    );
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.project_id, row.summary, row.started_at, row.finished_at);
    }

    return ids.map((id) => this.findById(id)!);
  }

  updateMany(rows: { id: string; summary?: string | null; finished_at?: string | null }[]): Session[] {
    const results: Session[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const summary = row.summary !== undefined ? row.summary : existing.summary;
      const finished_at = row.finished_at !== undefined ? row.finished_at : existing.finished_at;

      this.db
        .query("UPDATE sessions SET summary = ?, finished_at = ? WHERE id = ?")
        .run(summary, finished_at, row.id);

      results.push(this.findById(row.id)!);
    }

    return results;
  }

  deleteMany(ids: string[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM sessions WHERE id IN (${placeholders})`).run(...ids);
  }
}
