import type { Database } from "bun:sqlite";
import type { Action } from "../entities";

export class ActionRepository {
  constructor(private db: Database) {}

  findById(id: string): Action | null {
    return this.db.query("SELECT * FROM actions WHERE id = ?").get(id) as Action | null;
  }

  findByStatus(status: string, limit = 100): Action[] {
    return this.db
      .query("SELECT * FROM actions WHERE status = ? ORDER BY updated_at DESC LIMIT ?")
      .all(status, limit) as Action[];
  }

  findRecentlyTerminal(limit = 10): Action[] {
    return this.db
      .query(
        "SELECT * FROM actions WHERE status IN ('complete', 'failed') ORDER BY updated_at DESC LIMIT ?"
      )
      .all(limit) as Action[];
  }

  updateStatus(id: string, status: string): Action | null {
    const now = new Date().toISOString();
    this.db
      .query("UPDATE actions SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, now, id);
    return this.findById(id);
  }

  create(action: {
    id: string;
    prompt: string;
    agent: string | null;
    status: string;
    output: string | null;
    created_at: string;
    updated_at: string;
  }): void {
    this.db
      .query(
        "INSERT INTO actions (id, prompt, agent, status, output, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        action.id,
        action.prompt,
        action.agent,
        action.status,
        action.output,
        action.created_at,
        action.updated_at
      );
  }

  update(
    id: string,
    fields: { prompt?: string; agent?: string; output?: string | null; updated_at: string }
  ): void {
    const existing = this.findById(id);
    if (!existing) return;
    const prompt = fields.prompt ?? existing.prompt;
    const agent = fields.agent !== undefined ? fields.agent : existing.agent;
    const output = fields.output !== undefined ? fields.output : existing.output;
    this.db
      .query("UPDATE actions SET prompt = ?, agent = ?, output = ?, updated_at = ? WHERE id = ?")
      .run(prompt, agent, output, fields.updated_at, id);
  }

  findAll(limit: number, offset: number, filters?: { status?: string; agent?: string }): Action[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }
    if (filters?.agent) {
      conditions.push("agent = ?");
      params.push(filters.agent);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    return this.db
      .query(`SELECT * FROM actions ${where}ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as Action[];
  }

  count(filters?: { status?: string; agent?: string }): number {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }
    if (filters?.agent) {
      conditions.push("agent = ?");
      params.push(filters.agent);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM actions ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  countByStatus(): Record<string, number> {
    const rows = this.db
      .query("SELECT status, COUNT(*) as count FROM actions GROUP BY status")
      .all() as { status: string; count: number }[];

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result;
  }
}
