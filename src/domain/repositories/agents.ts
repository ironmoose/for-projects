import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Agent } from "../entities";

export interface AgentRow {
  id: string;
  name: string;
  description: string | null;
  platform_agent: string | null;
  prompt: string | null;
  created_at: string;
  updated_at: string;
}

export class AgentRepository {
  constructor(private db: Database) {}

  findById(id: string): Agent | null {
    return this.db.query("SELECT * FROM agents WHERE id = ?").get(id) as Agent | null;
  }

  findMany(filter?: { id?: string; limit?: number; offset?: number }): Agent[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    return this.db
      .query(`SELECT * FROM agents ${where}ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as Agent[];
  }

  count(filter?: { id?: string }): number {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM agents ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  insertMany(rows: Omit<AgentRow, "id" | "created_at" | "updated_at">[]): Agent[] {
    const stmt = this.db.query(
      "INSERT INTO agents (id, name, description, platform_agent, prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(
        id,
        row.name,
        row.description ?? null,
        row.platform_agent ?? null,
        row.prompt ?? null,
        now,
        now,
      );
    }

    return ids.map((id) => this.findById(id)!);
  }

  updateMany(rows: { id: string; name?: string; description?: string | null; platform_agent?: string | null; prompt?: string | null }[]): Agent[] {
    const now = new Date().toISOString();
    const results: Agent[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const name = row.name !== undefined ? row.name : existing.name;
      const description = row.description !== undefined ? row.description : existing.description;
      const platform_agent = row.platform_agent !== undefined ? row.platform_agent : existing.platform_agent;
      const prompt = row.prompt !== undefined ? row.prompt : existing.prompt;

      this.db
        .query("UPDATE agents SET name = ?, description = ?, platform_agent = ?, prompt = ?, updated_at = ? WHERE id = ?")
        .run(name, description, platform_agent, prompt, now, row.id);

      results.push(this.findById(row.id)!);
    }

    return results;
  }

  deleteMany(ids: string[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM agents WHERE id IN (${placeholders})`).run(...ids);
  }
}
