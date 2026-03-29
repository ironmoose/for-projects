import type { Database } from "bun:sqlite";
import type { Action } from "../entities";

export class ActionRepository {
  constructor(private db: Database) {}

  findById(id: string): Action | null {
    return this.db.query("SELECT * FROM actions WHERE id = ?").get(id) as Action | null;
  }

  create(action: {
    id: string;
    prompt: string;
    agent: string | null;
    created_at: string;
    updated_at: string;
  }): void {
    this.db
      .query(
        "INSERT INTO actions (id, prompt, agent, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(
        action.id,
        action.prompt,
        action.agent,
        action.created_at,
        action.updated_at
      );
  }

  update(
    id: string,
    fields: { prompt?: string; agent?: string; updated_at: string }
  ): void {
    const existing = this.findById(id);
    if (!existing) return;
    const prompt = fields.prompt ?? existing.prompt;
    const agent = fields.agent !== undefined ? fields.agent : existing.agent;
    this.db
      .query("UPDATE actions SET prompt = ?, agent = ?, updated_at = ? WHERE id = ?")
      .run(prompt, agent, fields.updated_at, id);
  }

  findAll(limit: number, offset: number, filters?: { agent?: string }): Action[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

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

  count(filters?: { agent?: string }): number {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

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
}
