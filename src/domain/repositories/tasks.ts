import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Task } from "../entities";
import type { CreateTaskInput, UpdateTaskInput } from "../inputs";
import type { TaskFilter } from "../services";

export class TaskRepository {
  constructor(private db: Database) {}

  private buildFilterQuery(projectId: string, filter?: TaskFilter): { where: string; joins: string; params: (string | number)[] } {
    const params: (string | number)[] = [];
    let joins = "";
    const clauses: string[] = ["t.project_id = ?"];
    params.push(projectId);

    if (filter?.tag || filter?.tag_prefix) {
      joins = "JOIN task_tags tt ON tt.task_id = t.id JOIN tags tg ON tg.id = tt.tag_id";
      if (filter?.tag) {
        clauses.push("tg.name = ?");
        params.push(filter.tag);
      }
      if (filter?.tag_prefix) {
        clauses.push("tg.prefix = ?");
        params.push(filter.tag_prefix);
      }
    }
    if (filter?.status) {
      clauses.push("t.status = ?");
      params.push(filter.status);
    }
    if (filter?.type) {
      clauses.push("t.type = ?");
      params.push(filter.type);
    }
    if (filter?.effort) {
      clauses.push("t.effort = ?");
      params.push(filter.effort);
    }

    return { where: clauses.join(" AND "), joins, params };
  }

  findByProject(projectId: string, limit: number, offset: number, filter?: TaskFilter): Task[] {
    const { where, joins, params } = this.buildFilterQuery(projectId, filter);
    return this.db
      .query(`SELECT t.* FROM tasks t ${joins} WHERE ${where} ORDER BY t.created_at ASC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as Task[];
  }

  countByProject(projectId: string, filter?: TaskFilter): number {
    const { where, joins, params } = this.buildFilterQuery(projectId, filter);
    return (this.db.query(
      `SELECT COUNT(*) as total FROM tasks t ${joins} WHERE ${where}`
    ).get(...params) as { total: number }).total;
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
          `INSERT INTO tasks (id, project_id, number, title, description, status, type, effort, priority, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(id, projectId, row.next_number, input.title, input.description ?? "", input.status ?? "todo", input.type ?? null, input.effort ?? null, input.priority ?? null, now, now);
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
    const type = input.type !== undefined ? input.type : existing.type;
    const effort = input.effort !== undefined ? input.effort : existing.effort;
    const priority = input.priority !== undefined ? input.priority : existing.priority;
    const now = new Date().toISOString();

    this.db
      .query(
        `UPDATE tasks SET title = ?, description = ?, status = ?, type = ?, effort = ?, priority = ?, updated_at = ? WHERE id = ? AND project_id = ?`
      )
      .run(title, description, status, type, effort, priority, now, id, projectId);

    return this.db.query("SELECT * FROM tasks WHERE id = ? AND project_id = ?").get(id, projectId) as Task;
  }

  delete(id: string, projectId: string): boolean {
    const result = this.db.query("DELETE FROM tasks WHERE id = ? AND project_id = ?").run(id, projectId);
    return result.changes > 0;
  }
}
