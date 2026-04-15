import type { Sql, Fragment } from "postgres";
import { ulid } from "ulid";
import type { Automation, AutomationSummary } from "../../entities";

type AutomationFilter = {
  title?: string; category?: string; is_favorite?: boolean;
  tag?: string; limit?: number; offset?: number;
};

export class PgAutomationRepository {
  constructor(private sql: Sql) {}

  async findById(id: string): Promise<Automation | null> {
    const rows = await this.sql<Automation[]>`SELECT * FROM automations WHERE id = ${id}`;
    return rows[0] ?? null;
  }

  async findMany(filter?: AutomationFilter): Promise<AutomationSummary[]> {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const { where, join } = this.buildFilter(filter);

    const rows = await this.sql<(Omit<AutomationSummary, "has_prompt" | "tags"> & { has_prompt: boolean })[]>`
      SELECT a.id, a.title, a.summary, a.agent, a.category,
        (a.prompt IS NOT NULL) as has_prompt, a.is_favorite,
        a.created_at, a.updated_at
      FROM automations a ${join} ${where}
      ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
    return rows.map((r) => ({
      ...r,
      tags: [] as string[],
    })) as AutomationSummary[];
  }

  async count(filter?: AutomationFilter): Promise<number> {
    const { where, join } = this.buildFilter(filter);
    const [row] = await this.sql<[{ total: string }]>`
      SELECT COUNT(*) as total FROM automations a ${join} ${where}
    `;
    return Number(row.total);
  }

  async insertMany(rows: { title: string; summary?: string | null; prompt?: string | null; agent?: string | null; category?: string | null; is_favorite: number | boolean }[]): Promise<Automation[]> {
    const now = new Date().toISOString();
    const results: Automation[] = [];

    for (const row of rows) {
      const id = ulid();
      const is_favorite = !!(row.is_favorite);
      await this.sql`
        INSERT INTO automations (id, title, summary, prompt, agent, category, is_favorite, created_at, updated_at)
        VALUES (${id}, ${row.title}, ${row.summary ?? null}, ${row.prompt ?? null}, ${row.agent ?? null}, ${row.category ?? null}, ${is_favorite}, ${now}, ${now})
      `;
      results.push({
        id, title: row.title, summary: row.summary ?? null,
        prompt: row.prompt ?? null, agent: row.agent ?? null,
        category: row.category ?? null, is_favorite,
        created_at: now, updated_at: now,
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
      const is_favorite = row.is_favorite !== undefined ? row.is_favorite : existing.is_favorite;

      await this.sql`
        UPDATE automations SET title = ${title}, summary = ${summary}, prompt = ${prompt},
          agent = ${agent}, category = ${category}, is_favorite = ${is_favorite}, updated_at = ${now}
        WHERE id = ${row.id}
      `;
      results.push({ id: row.id, title, summary, prompt, agent, category, is_favorite, created_at: existing.created_at, updated_at: now });
    }
    return results;
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.sql`DELETE FROM automations WHERE id IN ${this.sql(ids)}`;
  }

  private buildFilter(filter?: AutomationFilter): { where: Fragment; join: Fragment } {
    const conditions: Fragment[] = [];
    let join: Fragment = this.sql``;

    if (filter?.title) {
      conditions.push(this.sql`a.title ILIKE ${"%" + filter.title + "%"}`);
    }
    if (filter?.category) {
      conditions.push(this.sql`a.category = ${filter.category}`);
    }
    if (filter?.is_favorite !== undefined) {
      conditions.push(this.sql`a.is_favorite = ${filter.is_favorite}`);
    }
    if (filter?.tag) {
      join = this.sql`JOIN entity_tags et ON et.entity_type = 'automation' AND et.entity_id = a.id JOIN tags t ON t.id = et.tag_id`;
      conditions.push(this.sql`t.kind = ${filter.tag}`);
    }

    const where = conditions.length > 0
      ? this.sql`WHERE ${conditions.reduce((a, b) => this.sql`${a} AND ${b}`)}`
      : this.sql``;

    return { where, join };
  }
}
