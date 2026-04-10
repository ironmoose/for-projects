import type { Sql, Fragment } from "postgres";
import { ulid } from "ulid";
import type { Project, ProjectSummary } from "../../entities";

type ProjectFilter = { id?: string; title?: string; limit?: number; offset?: number };

export class PgProjectRepository {
  constructor(private sql: Sql) {}

  private where(filter?: ProjectFilter): Fragment {
    const conditions: Fragment[] = [];
    if (filter?.id) conditions.push(this.sql`id = ${filter.id}`);
    if (filter?.title) conditions.push(this.sql`title ILIKE ${"%" + filter.title + "%"}`);
    return conditions.length > 0
      ? this.sql`WHERE ${conditions.reduce((a, b) => this.sql`${a} AND ${b}`)}`
      : this.sql``;
  }

  async findById(id: string): Promise<Project | null> {
    const rows = await this.sql<Project[]>`SELECT * FROM projects WHERE id = ${id}`;
    return rows[0] ?? null;
  }

  async findMany(filter?: ProjectFilter): Promise<Project[]> {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    return this.sql<Project[]>`
      SELECT * FROM projects ${this.where(filter)}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async findManySummary(filter?: ProjectFilter): Promise<ProjectSummary[]> {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    return this.sql<ProjectSummary[]>`
      SELECT id, title, summary, (context IS NOT NULL) AS has_context, (requirements IS NOT NULL) AS has_requirements, created_at, updated_at FROM projects ${this.where(filter)}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async count(filter?: ProjectFilter): Promise<number> {
    const [row] = await this.sql<[{ total: string }]>`SELECT COUNT(*) as total FROM projects ${this.where(filter)}`;
    return Number(row.total);
  }

  async insertMany(rows: { title: string; summary?: string | null; context?: string | null; requirements?: string | null }[]): Promise<Project[]> {
    const now = new Date().toISOString();
    const results: Project[] = [];

    for (const row of rows) {
      const id = ulid();
      await this.sql`
        INSERT INTO projects (id, title, summary, context, requirements, created_at, updated_at)
        VALUES (${id}, ${row.title}, ${row.summary ?? null}, ${row.context ?? null}, ${row.requirements ?? null}, ${now}, ${now})
      `;
      results.push({ id, title: row.title, summary: row.summary ?? null, context: row.context ?? null, requirements: row.requirements ?? null, created_at: now, updated_at: now });
    }
    return results;
  }

  async updateMany(rows: { id: string; title?: string; summary?: string | null; context?: string | null; requirements?: string | null }[]): Promise<Project[]> {
    const now = new Date().toISOString();
    const results: Project[] = [];

    for (const row of rows) {
      const existing = await this.findById(row.id);
      if (!existing) continue;

      const title = row.title !== undefined ? row.title : existing.title;
      const summary = row.summary !== undefined ? row.summary : existing.summary;
      const context = row.context !== undefined ? row.context : existing.context;
      const requirements = row.requirements !== undefined ? row.requirements : existing.requirements;

      await this.sql`
        UPDATE projects SET title = ${title}, summary = ${summary}, context = ${context}, requirements = ${requirements}, updated_at = ${now}
        WHERE id = ${row.id}
      `;
      results.push({ id: row.id, title, summary, context, requirements, created_at: existing.created_at, updated_at: now });
    }
    return results;
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.sql`DELETE FROM projects WHERE id IN ${this.sql(ids)}`;
  }
}
