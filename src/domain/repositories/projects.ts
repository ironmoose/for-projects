import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Project, ProjectSummary } from "../entities";

export interface ProjectRow {
  id: string;
  title: string;
  goal: string | null;
  requirements: string | null;
  design: string | null;
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

  findById(id: string): Project | null {
    return this.db.query("SELECT * FROM projects WHERE id = ?").get(id) as Project | null;
  }

  findMany(filter?: ProjectFilter): Project[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const { where, params } = this.buildWhereClause(filter);
    params.push(limit, offset);

    return this.db
      .query(`SELECT * FROM projects ${where}ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as Project[];
  }

  findManySummary(filter?: ProjectFilter): ProjectSummary[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const { where, params } = this.buildWhereClause(filter);
    params.push(limit, offset);

    return this.db
      .query(`SELECT id, title, created_at, updated_at FROM projects ${where}ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as ProjectSummary[];
  }

  count(filter?: ProjectFilter): number {
    const { where, params } = this.buildWhereClause(filter);

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM projects ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  insertMany(rows: Omit<ProjectRow, "id" | "created_at" | "updated_at">[]): Project[] {
    const stmt = this.db.query(
      "INSERT INTO projects (id, title, goal, requirements, design, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.title, row.goal ?? null, row.requirements ?? null, row.design ?? null, now, now);
    }

    const results: Project[] = [];
    for (let i = 0; i < rows.length; i++) {
      results.push({
        id: ids[i],
        title: rows[i].title,
        goal: rows[i].goal ?? null,
        requirements: rows[i].requirements ?? null,
        design: rows[i].design ?? null,
        created_at: now,
        updated_at: now,
      });
    }
    return results;
  }

  updateMany(rows: { id: string; title?: string; goal?: string | null; requirements?: string | null; design?: string | null }[]): Project[] {
    const now = new Date().toISOString();
    const results: Project[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const title = row.title !== undefined ? row.title : existing.title;
      const goal = row.goal !== undefined ? row.goal : existing.goal;
      const requirements = row.requirements !== undefined ? row.requirements : existing.requirements;
      const design = row.design !== undefined ? row.design : existing.design;

      this.db
        .query("UPDATE projects SET title = ?, goal = ?, requirements = ?, design = ?, updated_at = ? WHERE id = ?")
        .run(title, goal, requirements, design, now, row.id);

      results.push({
        id: row.id,
        title,
        goal,
        requirements,
        design,
        created_at: existing.created_at,
        updated_at: now,
      });
    }

    return results;
  }

  deleteMany(ids: string[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM projects WHERE id IN (${placeholders})`).run(...ids);
  }
}
