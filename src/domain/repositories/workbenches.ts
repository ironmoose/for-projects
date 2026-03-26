import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Workbench } from "../entities";
import type { CreateWorkbenchInput, UpdateWorkbenchInput } from "../inputs";

export class WorkbenchRepository {
  constructor(private db: Database) {}

  findAll(limit: number, offset: number, status?: string): Workbench[] {
    if (status) {
      return this.db
        .query("SELECT * FROM workbenches WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
        .all(status, limit, offset) as Workbench[];
    }
    return this.db
      .query("SELECT * FROM workbenches ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .all(limit, offset) as Workbench[];
  }

  count(status?: string): number {
    if (status) {
      return (this.db.query("SELECT COUNT(*) as total FROM workbenches WHERE status = ?").get(status) as { total: number }).total;
    }
    return (this.db.query("SELECT COUNT(*) as total FROM workbenches").get() as { total: number }).total;
  }

  findById(id: string): Workbench | null {
    return this.db.query("SELECT * FROM workbenches WHERE id = ?").get(id) as Workbench | null;
  }

  create(input: CreateWorkbenchInput): Workbench {
    const id = ulid();
    const now = new Date().toISOString();
    const cursor = input.cursor ?? null;
    const status = input.status ?? "idle";

    this.db
      .query(
        `INSERT INTO workbenches (id, goal, cursor, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, input.goal, cursor, status, now, now);

    return this.findById(id)!;
  }

  update(id: string, input: UpdateWorkbenchInput): Workbench | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const goal = input.goal ?? existing.goal;
    const cursor = input.cursor !== undefined ? input.cursor : existing.cursor;
    const status = input.status ?? existing.status;
    const now = new Date().toISOString();

    this.db
      .query("UPDATE workbenches SET goal = ?, cursor = ?, status = ?, updated_at = ? WHERE id = ?")
      .run(goal, cursor, status, now, id);

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.query("DELETE FROM workbenches WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
