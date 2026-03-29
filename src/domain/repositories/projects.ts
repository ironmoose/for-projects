import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Project } from "../entities";
import type { CreateProjectInput, UpdateProjectInput } from "../inputs";

export class ProjectRepository {
  constructor(private db: Database) {}

  findAll(limit: number, offset: number, status?: string): Project[] {
    if (status) {
      return this.db
        .query("SELECT * FROM projects WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
        .all(status, limit, offset) as Project[];
    }
    return this.db
      .query("SELECT * FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .all(limit, offset) as Project[];
  }

  count(status?: string): number {
    if (status) {
      return (this.db.query("SELECT COUNT(*) as total FROM projects WHERE status = ?").get(status) as { total: number }).total;
    }
    return (this.db.query("SELECT COUNT(*) as total FROM projects").get() as { total: number }).total;
  }

  findById(id: string): Project | null {
    return (
      this.db.query("SELECT * FROM projects WHERE id = ?").get(id) as Project | null
    );
  }

  create(input: CreateProjectInput): Project {
    const id = ulid();
    const now = new Date().toISOString();

    this.db
      .query(
        `INSERT INTO projects (id, name, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.name,
        input.description ?? "",
        input.status ?? "active",
        now,
        now
      );

    return this.findById(id)!;
  }

  update(id: string, input: UpdateProjectInput): Project | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const name = input.name ?? existing.name;
    const description = input.description ?? existing.description;
    const status = input.status ?? existing.status;
    const now = new Date().toISOString();

    this.db
      .query(
        `UPDATE projects
         SET name = ?, description = ?, status = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(name, description, status, now, id);

    return this.findById(id)!;
  }
}
