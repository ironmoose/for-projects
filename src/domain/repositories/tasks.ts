import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Task } from "../entities";
import type { CreateTaskInput, UpdateTaskInput } from "../inputs";
import type { TaskFilter } from "../services";

export class TaskRepository {
  constructor(private db: Database) {}

  findByProject(projectId: string, limit: number, offset: number, filter?: TaskFilter): Task[] {
    if (filter?.tag) {
      const statusClause = filter.status ? "AND t.status = ?" : "";
      return this.db
        .query(
          `SELECT t.* FROM tasks t
           JOIN task_tags tt ON tt.task_id = t.id
           JOIN tags tg ON tg.id = tt.tag_id
           WHERE tg.name = ? AND t.project_id = ? ${statusClause}
           ORDER BY t.created_at ASC LIMIT ? OFFSET ?`
        )
        .all(filter.tag, projectId, ...(filter.status ? [filter.status] : []), limit, offset) as Task[];
    }
    if (filter?.status) {
      return this.db
        .query("SELECT * FROM tasks WHERE project_id = ? AND status = ? ORDER BY created_at ASC LIMIT ? OFFSET ?")
        .all(projectId, filter.status, limit, offset) as Task[];
    }
    return this.db
      .query("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?")
      .all(projectId, limit, offset) as Task[];
  }

  countByProject(projectId: string, filter?: TaskFilter): number {
    if (filter?.tag) {
      const statusClause = filter.status ? "AND t.status = ?" : "";
      return (this.db.query(
        `SELECT COUNT(*) as total FROM tasks t
         JOIN task_tags tt ON tt.task_id = t.id
         JOIN tags tg ON tg.id = tt.tag_id
         WHERE tg.name = ? AND t.project_id = ? ${statusClause}`
      ).get(filter.tag, projectId, ...(filter.status ? [filter.status] : [])) as { total: number }).total;
    }
    if (filter?.status) {
      return (this.db.query("SELECT COUNT(*) as total FROM tasks WHERE project_id = ? AND status = ?").get(projectId, filter.status) as { total: number }).total;
    }
    return (this.db.query("SELECT COUNT(*) as total FROM tasks WHERE project_id = ?").get(projectId) as { total: number }).total;
  }

  findByNumber(projectId: string, number: number): Task | null {
    return this.db
      .query("SELECT * FROM tasks WHERE project_id = ? AND number = ?")
      .get(projectId, number) as Task | null;
  }

  findById(id: string): Task | null {
    return this.db.query("SELECT * FROM tasks WHERE id = ?").get(id) as Task | null;
  }

  create(projectId: string, input: CreateTaskInput): Task {
    const id = ulid();
    const now = new Date().toISOString();

    this.db.transaction(() => {
      const row = this.db
        .query("SELECT COALESCE(MAX(number), 0) + 1 as next_number FROM tasks WHERE project_id = ?")
        .get(projectId) as { next_number: number };

      this.db
        .query(
          `INSERT INTO tasks (id, project_id, number, title, description, status, priority, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(id, projectId, row.next_number, input.title, input.description ?? "", input.status ?? "todo", input.priority ?? null, now, now);
    })();

    return this.db.query("SELECT * FROM tasks WHERE id = ?").get(id) as Task;
  }

  update(id: string, projectId: string, input: UpdateTaskInput): Task | null {
    const existing = this.db
      .query("SELECT * FROM tasks WHERE id = ? AND project_id = ?")
      .get(id, projectId) as Task | null;
    if (!existing) return null;

    const title = input.title ?? existing.title;
    const description = input.description ?? existing.description;
    const status = input.status ?? existing.status;
    const priority = input.priority !== undefined ? input.priority : existing.priority;
    const now = new Date().toISOString();

    this.db
      .query(
        `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, updated_at = ? WHERE id = ? AND project_id = ?`
      )
      .run(title, description, status, priority, now, id, projectId);

    return this.db.query("SELECT * FROM tasks WHERE id = ? AND project_id = ?").get(id, projectId) as Task;
  }

  delete(id: string, projectId: string): boolean {
    const result = this.db.query("DELETE FROM tasks WHERE id = ? AND project_id = ?").run(id, projectId);
    return result.changes > 0;
  }
}
