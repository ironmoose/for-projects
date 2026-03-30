import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Action, ActionKind, AgentType } from "../entities";

export interface ActionRow {
  id: string;
  kind: ActionKind;
  prompt: string;
  agent: AgentType;
  created_at: string;
  updated_at: string;
}

export class ActionRepository {
  constructor(private db: Database) {}

  findById(id: string): Action | null {
    return this.db.query("SELECT * FROM actions WHERE id = ?").get(id) as Action | null;
  }

  findByKind(kind: ActionKind): Action | null {
    return this.db.query("SELECT * FROM actions WHERE kind = ?").get(kind) as Action | null;
  }

  findMany(filter?: { id?: string; limit?: number; offset?: number; kind?: ActionKind; agent?: AgentType }): Action[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.kind) {
      conditions.push("kind = ?");
      params.push(filter.kind);
    }
    if (filter?.agent) {
      conditions.push("agent = ?");
      params.push(filter.agent);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    return this.db
      .query(`SELECT * FROM actions ${where}ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as Action[];
  }

  count(filter?: { id?: string; kind?: ActionKind; agent?: AgentType }): number {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.kind) {
      conditions.push("kind = ?");
      params.push(filter.kind);
    }
    if (filter?.agent) {
      conditions.push("agent = ?");
      params.push(filter.agent);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM actions ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  insertMany(rows: Omit<ActionRow, "id" | "created_at" | "updated_at">[]): Action[] {
    const stmt = this.db.query(
      "INSERT INTO actions (id, kind, prompt, agent, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.kind, row.prompt, row.agent, now, now);
    }

    return ids.map((id) => this.findById(id)!);
  }

  updateMany(rows: { id: string; kind?: ActionKind; prompt?: string; agent?: AgentType }[]): Action[] {
    const now = new Date().toISOString();
    const results: Action[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const kind = row.kind !== undefined ? row.kind : existing.kind;
      const prompt = row.prompt !== undefined ? row.prompt : existing.prompt;
      const agent = row.agent !== undefined ? row.agent : existing.agent;

      this.db
        .query("UPDATE actions SET kind = ?, prompt = ?, agent = ?, updated_at = ? WHERE id = ?")
        .run(kind, prompt, agent, now, row.id);

      results.push(this.findById(row.id)!);
    }

    return results;
  }

  deleteMany(ids: string[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM actions WHERE id IN (${placeholders})`).run(...ids);
  }
}
