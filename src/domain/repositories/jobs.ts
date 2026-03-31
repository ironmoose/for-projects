import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Job } from "../entities";

export interface JobRow {
  id: string;
  agent_id: string;
  status: string;
  input: string | null;
  output: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export class JobRepository {
  constructor(private db: Database) {}

  findById(id: string): Job | null {
    return this.db.query("SELECT * FROM jobs WHERE id = ?").get(id) as Job | null;
  }

  findMany(filter?: { id?: string; agent_id?: string; status?: string; limit?: number; offset?: number }): Job[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.agent_id) {
      conditions.push("agent_id = ?");
      params.push(filter.agent_id);
    }
    if (filter?.status) {
      conditions.push("status = ?");
      params.push(filter.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    return this.db
      .query(`SELECT * FROM jobs ${where}ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as Job[];
  }

  count(filter?: { id?: string; agent_id?: string; status?: string }): number {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.agent_id) {
      conditions.push("agent_id = ?");
      params.push(filter.agent_id);
    }
    if (filter?.status) {
      conditions.push("status = ?");
      params.push(filter.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM jobs ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  insertMany(rows: Omit<JobRow, "id" | "created_at" | "updated_at">[]): Job[] {
    const stmt = this.db.query(
      "INSERT INTO jobs (id, agent_id, status, input, output, started_at, ended_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(
        id,
        row.agent_id,
        row.status,
        row.input ?? null,
        row.output ?? null,
        row.started_at ?? null,
        row.ended_at ?? null,
        now,
        now,
      );
    }

    return ids.map((id) => this.findById(id)!);
  }

  updateMany(rows: { id: string; status?: string; input?: string | null; output?: string | null; started_at?: string | null; ended_at?: string | null }[]): Job[] {
    const now = new Date().toISOString();
    const results: Job[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const status = row.status !== undefined ? row.status : existing.status;
      const input = row.input !== undefined ? row.input : existing.input;
      const output = row.output !== undefined ? row.output : existing.output;
      const started_at = row.started_at !== undefined ? row.started_at : existing.started_at;
      const ended_at = row.ended_at !== undefined ? row.ended_at : existing.ended_at;

      this.db
        .query("UPDATE jobs SET status = ?, input = ?, output = ?, started_at = ?, ended_at = ?, updated_at = ? WHERE id = ?")
        .run(status, input, output, started_at, ended_at, now, row.id);

      results.push(this.findById(row.id)!);
    }

    return results;
  }

  deleteMany(ids: string[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM jobs WHERE id IN (${placeholders})`).run(...ids);
  }
}
