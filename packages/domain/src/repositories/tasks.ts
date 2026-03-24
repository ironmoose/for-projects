import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Task } from "../entities";
import type { CreateTaskInput } from "../inputs";
import type { UpdateTaskInput } from "../inputs";

export class TaskRepository {
  constructor(private db: Database) {}

  findByProject(projectId: string): Task[] {
    return this.db
      .query("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC")
      .all(projectId) as Task[];
  }

  create(projectId: string, input: CreateTaskInput): Task {
    const id = ulid();
    const now = new Date().toISOString();

    this.db
      .query(
        `INSERT INTO tasks (id, project_id, title, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        projectId,
        input.title,
        input.description ?? "",
        input.status ?? "todo",
        now,
        now
      );

    return this.db.query("SELECT * FROM tasks WHERE id = ?").get(id) as Task;
  }

  update(id: string, input: UpdateTaskInput): Task | null {
    const existing = this.db
      .query("SELECT * FROM tasks WHERE id = ?")
      .get(id) as Task | null;
    if (!existing) return null;

    const title = input.title ?? existing.title;
    const description = input.description ?? existing.description;
    const status = input.status ?? existing.status;
    const now = new Date().toISOString();

    this.db
      .query(
        `UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = ? WHERE id = ?`
      )
      .run(title, description, status, now, id);

    return this.db.query("SELECT * FROM tasks WHERE id = ?").get(id) as Task;
  }

  delete(id: string): boolean {
    const result = this.db.query("DELETE FROM tasks WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
