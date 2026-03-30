import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Task } from "../entities";

export interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  plan: string | null;
  created_at: string;
  updated_at: string;
}

export class TaskRepository {
  constructor(private db: Database) {}

  findById(id: string): Task | null {
    return this.db.query("SELECT * FROM tasks WHERE id = ?").get(id) as Task | null;
  }

  findMany(filter?: { limit?: number; offset?: number; project_id?: string }): Task[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;

    if (filter?.project_id) {
      return this.db
        .query("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?")
        .all(filter.project_id, limit, offset) as Task[];
    }

    return this.db
      .query("SELECT * FROM tasks ORDER BY created_at ASC LIMIT ? OFFSET ?")
      .all(limit, offset) as Task[];
  }

  count(filter?: { project_id?: string }): number {
    if (filter?.project_id) {
      return (this.db.query("SELECT COUNT(*) as total FROM tasks WHERE project_id = ?").get(filter.project_id) as { total: number }).total;
    }
    return (this.db.query("SELECT COUNT(*) as total FROM tasks").get() as { total: number }).total;
  }

  insertMany(rows: Omit<TaskRow, "id" | "created_at" | "updated_at">[]): Task[] {
    const stmt = this.db.query(
      "INSERT INTO tasks (id, project_id, title, plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.project_id, row.title, row.plan ?? null, now, now);
    }

    return ids.map((id) => this.findById(id)!);
  }

  updateMany(rows: { id: string; title?: string; plan?: string | null }[]): Task[] {
    const now = new Date().toISOString();
    const results: Task[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const title = row.title !== undefined ? row.title : existing.title;
      const plan = row.plan !== undefined ? row.plan : existing.plan;

      this.db
        .query("UPDATE tasks SET title = ?, plan = ?, updated_at = ? WHERE id = ?")
        .run(title, plan, now, row.id);

      results.push(this.findById(row.id)!);
    }

    return results;
  }

  deleteMany(ids: string[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM tasks WHERE id IN (${placeholders})`).run(...ids);
  }
}
