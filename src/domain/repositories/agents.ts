import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Agent } from "../entities";

export interface AgentRow {
  id: string;
  identifier: string;
  prompt: string;
  agent: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export class AgentRepository {
  constructor(private db: Database) {}

  findById(id: string): Agent | null {
    return this.db.query("SELECT * FROM agents WHERE id = ?").get(id) as Agent | null;
  }

  findByIdentifier(identifier: string): Agent | null {
    return this.db.query("SELECT * FROM agents WHERE identifier = ?").get(identifier) as Agent | null;
  }

  findMany(filter?: { id?: string; limit?: number; offset?: number; identifier?: string; agent?: string; enabled?: number }): Agent[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.identifier) {
      conditions.push("identifier = ?");
      params.push(filter.identifier);
    }
    if (filter?.agent) {
      conditions.push("agent = ?");
      params.push(filter.agent);
    }
    if (filter?.enabled !== undefined) {
      conditions.push("enabled = ?");
      params.push(filter.enabled);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    return this.db
      .query(`SELECT * FROM agents ${where}ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as Agent[];
  }

  count(filter?: { id?: string; identifier?: string; agent?: string; enabled?: number }): number {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.identifier) {
      conditions.push("identifier = ?");
      params.push(filter.identifier);
    }
    if (filter?.agent) {
      conditions.push("agent = ?");
      params.push(filter.agent);
    }
    if (filter?.enabled !== undefined) {
      conditions.push("enabled = ?");
      params.push(filter.enabled);
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
      "INSERT INTO agents (id, identifier, prompt, agent, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.identifier, row.prompt, row.agent, row.enabled, now, now);
    }

    return ids.map((id) => this.findById(id)!);
  }

  updateMany(rows: { id: string; identifier?: string; prompt?: string; agent?: string; enabled?: number }[]): Agent[] {
    const now = new Date().toISOString();
    const results: Agent[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const identifier = row.identifier !== undefined ? row.identifier : existing.identifier;
      const prompt = row.prompt !== undefined ? row.prompt : existing.prompt;
      const agent = row.agent !== undefined ? row.agent : existing.agent;
      const enabled = row.enabled !== undefined ? row.enabled : existing.enabled;

      this.db
        .query("UPDATE agents SET identifier = ?, prompt = ?, agent = ?, enabled = ?, updated_at = ? WHERE id = ?")
        .run(identifier, prompt, agent, enabled, now, row.id);

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
