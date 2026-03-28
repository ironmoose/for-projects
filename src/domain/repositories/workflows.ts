import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Workflow } from "../entities";
import type { CreateWorkflowInput, UpdateWorkflowInput } from "../inputs";

export class WorkflowRepository {
  constructor(private db: Database) {}

  findAll(limit: number, offset: number, status?: string): Workflow[] {
    if (status) {
      return this.db
        .query("SELECT * FROM workflows WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
        .all(status, limit, offset) as Workflow[];
    }
    return this.db
      .query("SELECT * FROM workflows ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .all(limit, offset) as Workflow[];
  }

  count(status?: string): number {
    if (status) {
      return (this.db.query("SELECT COUNT(*) as total FROM workflows WHERE status = ?").get(status) as { total: number }).total;
    }
    return (this.db.query("SELECT COUNT(*) as total FROM workflows").get() as { total: number }).total;
  }

  findById(id: string): Workflow | null {
    return this.db.query("SELECT * FROM workflows WHERE id = ?").get(id) as Workflow | null;
  }

  create(input: CreateWorkflowInput): Workflow {
    const id = ulid();
    const now = new Date().toISOString();
    const cursor = input.cursor ?? null;
    const status = input.status ?? "idle";

    this.db
      .query(
        `INSERT INTO workflows (id, goal, cursor, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, input.goal, cursor, status, now, now);

    return this.findById(id)!;
  }

  update(id: string, input: UpdateWorkflowInput): Workflow | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const goal = input.goal ?? existing.goal;
    const cursor = input.cursor !== undefined ? input.cursor : existing.cursor;
    const status = input.status ?? existing.status;
    const now = new Date().toISOString();

    this.db
      .query("UPDATE workflows SET goal = ?, cursor = ?, status = ?, updated_at = ? WHERE id = ?")
      .run(goal, cursor, status, now, id);

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.query("DELETE FROM workflows WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
