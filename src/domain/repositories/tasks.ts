import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Task } from "../entities";

export interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  plan: string | null;
  description: string | null;
  implementation: string | null;
  acceptance_criteria: string | null;
  created_at: string;
  updated_at: string;
}

export class TaskRepository {
  constructor(private db: Database) {}

  findById(id: string): Task | null {
    return this.db.query("SELECT * FROM tasks WHERE id = ?").get(id) as Task | null;
  }

  findMany(filter?: { id?: string; limit?: number; offset?: number; project_id?: string }): Task[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.project_id) {
      conditions.push("project_id = ?");
      params.push(filter.project_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    return this.db
      .query(`SELECT * FROM tasks ${where}ORDER BY created_at ASC LIMIT ? OFFSET ?`)
      .all(...params) as Task[];
  }

  count(filter?: { id?: string; project_id?: string }): number {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.project_id) {
      conditions.push("project_id = ?");
      params.push(filter.project_id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM tasks ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  insertMany(rows: Omit<TaskRow, "id" | "created_at" | "updated_at">[]): Task[] {
    const stmt = this.db.query(
      "INSERT INTO tasks (id, project_id, title, plan, description, implementation, acceptance_criteria, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.project_id, row.title, row.plan ?? null, row.description ?? null, row.implementation ?? null, row.acceptance_criteria ?? null, now, now);
    }

    return ids.map((id) => this.findById(id)!);
  }

  updateMany(rows: { id: string; title?: string; plan?: string | null; description?: string | null; implementation?: string | null; acceptance_criteria?: string | null }[]): Task[] {
    const now = new Date().toISOString();
    const results: Task[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const title = row.title !== undefined ? row.title : existing.title;
      const plan = row.plan !== undefined ? row.plan : existing.plan;
      const description = row.description !== undefined ? row.description : existing.description;
      const implementation = row.implementation !== undefined ? row.implementation : existing.implementation;
      const acceptance_criteria = row.acceptance_criteria !== undefined ? row.acceptance_criteria : existing.acceptance_criteria;

      this.db
        .query("UPDATE tasks SET title = ?, plan = ?, description = ?, implementation = ?, acceptance_criteria = ?, updated_at = ? WHERE id = ?")
        .run(title, plan, description, implementation, acceptance_criteria, now, row.id);

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
