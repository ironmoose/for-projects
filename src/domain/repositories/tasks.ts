import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Task } from "../entities";
import type { CreateTaskInput, UpdateTaskInput } from "../inputs";

export class TaskRepository {
  constructor(private db: Database) {}

  findByProject(projectId: string, limit: number, offset: number, status?: string): Task[] {
    if (status) {
      return this.db
        .query("SELECT * FROM tasks WHERE project_id = ? AND status = ? ORDER BY created_at ASC LIMIT ? OFFSET ?")
        .all(projectId, status, limit, offset) as Task[];
    }
    return this.db
      .query("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?")
      .all(projectId, limit, offset) as Task[];
  }

  countByProject(projectId: string, status?: string): number {
    if (status) {
      return (this.db.query(
        "SELECT COUNT(*) as total FROM tasks WHERE project_id = ? AND status = ?"
      ).get(projectId, status) as { total: number }).total;
    }
    return (this.db.query(
      "SELECT COUNT(*) as total FROM tasks WHERE project_id = ?"
    ).get(projectId) as { total: number }).total;
  }

  findById(id: string): Task | null {
    return this.db.query("SELECT * FROM tasks WHERE id = ?").get(id) as Task | null;
  }

  create(input: CreateTaskInput): Task {
    const id = ulid();
    const now = new Date().toISOString();

    this.db
      .query(
        `INSERT INTO tasks (id, project_id, summary, context, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.project_id,
        input.summary,
        input.context ?? "",
        input.status ?? "todo",
        now,
        now
      );

    return this.findById(id)!;
  }

  update(id: string, input: UpdateTaskInput): Task | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const summary = input.summary ?? existing.summary;
    const context = input.context ?? existing.context;
    const status = input.status ?? existing.status;
    const now = new Date().toISOString();

    this.db
      .query(
        `UPDATE tasks SET summary = ?, context = ?, status = ?, updated_at = ? WHERE id = ?`
      )
      .run(summary, context, status, now, id);

    return this.findById(id)!;
  }
}
