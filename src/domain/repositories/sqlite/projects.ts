import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Project, ProjectSummary } from "../../entities";

export interface ProjectRow {
  id: string;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

type ProjectFilter = { id?: string; title?: string; limit?: number; offset?: number };

export class ProjectRepository {
  constructor(private db: Database) {}

  private buildWhereClause(filter?: ProjectFilter): { where: string; params: (string | number)[] } {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.title) {
      conditions.push("title LIKE ?");
      params.push(`%${filter.title}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    return { where, params };
  }

  async findById(id: string): Promise<Project | null> {
    return this.db.query("SELECT * FROM projects WHERE id = ?").get(id) as Project | null;
  }

  async findMany(filter?: ProjectFilter): Promise<Project[]> {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const { where, params } = this.buildWhereClause(filter);
    params.push(limit, offset);

    return this.db
      .query(`SELECT * FROM projects ${where}ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as Project[];
  }

  async findManySummary(filter?: ProjectFilter): Promise<ProjectSummary[]> {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const { where, params } = this.buildWhereClause(filter);
    params.push(limit, offset);

    return this.db
      .query(`SELECT id, title, summary, created_at, updated_at FROM projects ${where}ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as ProjectSummary[];
  }

  async count(filter?: ProjectFilter): Promise<number> {
    const { where, params } = this.buildWhereClause(filter);

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM projects ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  async insertMany(rows: Omit<ProjectRow, "id" | "created_at" | "updated_at">[]): Promise<Project[]> {
    const stmt = this.db.query(
      "INSERT INTO projects (id, title, summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.title, row.summary ?? null, now, now);
    }

    const results: Project[] = [];
    for (let i = 0; i < rows.length; i++) {
      results.push({
        id: ids[i],
        title: rows[i].title,
        summary: rows[i].summary ?? null,
        created_at: now,
        updated_at: now,
      });
    }
    return results;
  }

  async updateMany(rows: { id: string; title?: string; summary?: string | null }[]): Promise<Project[]> {
    const now = new Date().toISOString();
    const results: Project[] = [];

    for (const row of rows) {
      const existing = await this.findById(row.id);
      if (!existing) continue;

      const title = row.title !== undefined ? row.title : existing.title;
      const summary = row.summary !== undefined ? row.summary : existing.summary;

      this.db
        .query("UPDATE projects SET title = ?, summary = ?, updated_at = ? WHERE id = ?")
        .run(title, summary, now, row.id);

      results.push({
        id: row.id,
        title,
        summary,
        created_at: existing.created_at,
        updated_at: now,
      });
    }

    return results;
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM projects WHERE id IN (${placeholders})`).run(...ids);
  }
}
