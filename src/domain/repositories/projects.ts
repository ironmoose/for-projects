import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Project } from "../entities";
import type { CreateProjectInput, UpdateProjectInput } from "../inputs";
import type { ProjectFilter } from "../services";

export class ProjectRepository {
  constructor(private db: Database) {}

  findAll(limit: number, offset: number, filter?: ProjectFilter): Project[] {
    if (filter?.status) {
      return this.db
        .query("SELECT * FROM projects WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
        .all(filter.status, limit, offset) as Project[];
    }
    return this.db
      .query("SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .all(limit, offset) as Project[];
  }

  count(filter?: ProjectFilter): number {
    if (filter?.status) {
      return (this.db.query("SELECT COUNT(*) as total FROM projects WHERE status = ?").get(filter.status) as { total: number }).total;
    }
    return (this.db.query("SELECT COUNT(*) as total FROM projects").get() as { total: number }).total;
  }

  findById(id: string): Project | null {
    return (
      this.db.query("SELECT * FROM projects WHERE id = ?").get(id) as Project | null
    );
  }

  findBySlug(slug: string): Project | null {
    return (
      this.db.query("SELECT * FROM projects WHERE slug = ?").get(slug) as Project | null
    );
  }

  create(input: CreateProjectInput): Project {
    const id = ulid();
    const now = new Date().toISOString();

    this.db
      .query(
        `INSERT INTO projects (id, slug, name, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.slug,
        input.name,
        input.description ?? "",
        input.status ?? "active",
        now,
        now
      );

    return this.findById(id)!;
  }

  update(slug: string, input: UpdateProjectInput): Project | null {
    const existing = this.findBySlug(slug);
    if (!existing) return null;

    const name = input.name ?? existing.name;
    const description = input.description ?? existing.description;
    const status = input.status ?? existing.status;
    const now = new Date().toISOString();

    this.db
      .query(
        `UPDATE projects
         SET name = ?, description = ?, status = ?, updated_at = ?
         WHERE slug = ?`
      )
      .run(name, description, status, now, slug);

    return this.findBySlug(slug)!;
  }

  delete(slug: string): boolean {
    const result = this.db
      .query("DELETE FROM projects WHERE slug = ?")
      .run(slug);
    return result.changes > 0;
  }
}
