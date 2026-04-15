import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Automation, AutomationSummary } from "../../entities";

export interface AutomationRow {
  id: string;
  title: string;
  summary: string | null;
  prompt: string | null;
  agent: string | null;
  category: string | null;
  is_favorite: number;
  created_at: string;
  updated_at: string;
}

function toAutomation(row: AutomationRow): Automation {
  return {
    ...row,
    is_favorite: !!row.is_favorite,
  };
}

export class AutomationRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Automation | null> {
    const row = this.db.query("SELECT * FROM automations WHERE id = ?").get(id) as AutomationRow | null;
    return row ? toAutomation(row) : null;
  }

  async findMany(filter?: { title?: string; category?: string; is_favorite?: boolean; tag?: string; limit?: number; offset?: number }): Promise<AutomationSummary[]> {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let join = "";

    if (filter?.title) {
      conditions.push("a.title LIKE ?");
      params.push(`%${filter.title}%`);
    }
    if (filter?.category) {
      conditions.push("a.category = ?");
      params.push(filter.category);
    }
    if (filter?.is_favorite !== undefined) {
      conditions.push("a.is_favorite = ?");
      params.push(filter.is_favorite ? 1 : 0);
    }
    if (filter?.tag) {
      join = " JOIN entity_tags et ON et.entity_type = 'automation' AND et.entity_id = a.id JOIN tags t ON t.id = et.tag_id";
      conditions.push("t.kind = ?");
      params.push(filter.tag);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    const rows = this.db
      .query(`SELECT a.id, a.title, a.summary, a.agent, a.category, (a.prompt IS NOT NULL) as has_prompt, a.is_favorite, a.created_at, a.updated_at FROM automations a${join} ${where}ORDER BY a.created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as (Omit<AutomationSummary, "has_prompt" | "is_favorite" | "tags"> & { has_prompt: number; is_favorite: number })[];
    return rows.map((r) => ({ ...r, has_prompt: !!r.has_prompt, is_favorite: !!r.is_favorite, tags: [] as string[] })) as AutomationSummary[];
  }

  async count(filter?: { title?: string; category?: string; is_favorite?: boolean; tag?: string }): Promise<number> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let join = "";

    if (filter?.title) {
      conditions.push("a.title LIKE ?");
      params.push(`%${filter.title}%`);
    }
    if (filter?.category) {
      conditions.push("a.category = ?");
      params.push(filter.category);
    }
    if (filter?.is_favorite !== undefined) {
      conditions.push("a.is_favorite = ?");
      params.push(filter.is_favorite ? 1 : 0);
    }
    if (filter?.tag) {
      join = " JOIN entity_tags et ON et.entity_type = 'automation' AND et.entity_id = a.id JOIN tags t ON t.id = et.tag_id";
      conditions.push("t.kind = ?");
      params.push(filter.tag);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM automations a${join} ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  async insertMany(rows: { title: string; summary?: string | null; prompt?: string | null; agent?: string | null; category?: string | null; is_favorite: number | boolean }[]): Promise<Automation[]> {
    const stmt = this.db.query(
      "INSERT INTO automations (id, title, summary, prompt, agent, category, is_favorite, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.title, row.summary ?? null, row.prompt ?? null, row.agent ?? null, row.category ?? null, row.is_favorite ? 1 : 0, now, now);
    }

    const results: Automation[] = [];
    for (let i = 0; i < rows.length; i++) {
      results.push({
        id: ids[i],
        title: rows[i].title,
        summary: rows[i].summary ?? null,
        prompt: rows[i].prompt ?? null,
        agent: rows[i].agent ?? null,
        category: rows[i].category ?? null,
        is_favorite: !!rows[i].is_favorite,
        created_at: now,
        updated_at: now,
      });
    }
    return results;
  }

  async updateMany(rows: { id: string; title?: string; summary?: string | null; prompt?: string | null; agent?: string | null; category?: string | null; is_favorite?: boolean }[]): Promise<Automation[]> {
    const now = new Date().toISOString();
    const results: Automation[] = [];

    for (const row of rows) {
      const existing = await this.findById(row.id);
      if (!existing) continue;

      const title = row.title !== undefined ? row.title : existing.title;
      const summary = row.summary !== undefined ? row.summary : existing.summary;
      const prompt = row.prompt !== undefined ? row.prompt : existing.prompt;
      const agent = row.agent !== undefined ? row.agent : existing.agent;
      const category = row.category !== undefined ? row.category : existing.category;
      const is_favorite = row.is_favorite !== undefined ? (row.is_favorite ? 1 : 0) : (existing.is_favorite ? 1 : 0);

      this.db
        .query("UPDATE automations SET title = ?, summary = ?, prompt = ?, agent = ?, category = ?, is_favorite = ?, updated_at = ? WHERE id = ?")
        .run(title, summary, prompt, agent, category, is_favorite, now, row.id);

      results.push({
        id: row.id,
        title,
        summary,
        prompt,
        agent,
        category,
        is_favorite: !!is_favorite,
        created_at: existing.created_at,
        updated_at: now,
      });
    }

    return results;
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM automations WHERE id IN (${placeholders})`).run(...ids);
  }
}
