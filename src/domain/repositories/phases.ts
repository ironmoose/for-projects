import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Phase } from "../entities";
import type { CreatePhaseInput, UpdatePhaseInput } from "../inputs";

export class PhaseRepository {
  constructor(private db: Database) {}

  findById(id: string): Phase | null {
    return this.db.query("SELECT * FROM phases WHERE id = ?").get(id) as Phase | null;
  }

  findAllByWorkflow(workflowId: string): Phase[] {
    return this.db
      .query("SELECT * FROM phases WHERE workflow_id = ? ORDER BY position ASC")
      .all(workflowId) as Phase[];
  }

  findByWorkflowPaginated(workflowId: string, limit: number, offset: number): Phase[] {
    return this.db
      .query("SELECT * FROM phases WHERE workflow_id = ? ORDER BY position ASC LIMIT ? OFFSET ?")
      .all(workflowId, limit, offset) as Phase[];
  }

  countByWorkflow(workflowId: string): number {
    return (
      this.db
        .query("SELECT COUNT(*) as total FROM phases WHERE workflow_id = ?")
        .get(workflowId) as { total: number }
    ).total;
  }

  nextPosition(workflowId: string): number {
    const row = this.db
      .query("SELECT COALESCE(MAX(position), -1) + 1 as next FROM phases WHERE workflow_id = ?")
      .get(workflowId) as { next: number };
    return row.next;
  }

  create(workflowId: string, input: CreatePhaseInput, position: number): Phase {
    const id = ulid();
    const now = new Date().toISOString();

    this.db
      .query(
        `INSERT INTO phases (id, workflow_id, title, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, workflowId, input.title, position, now, now);

    return this.findById(id)!;
  }

  update(id: string, input: UpdatePhaseInput): Phase | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const title = input.title ?? existing.title;
    const now = new Date().toISOString();

    this.db
      .query("UPDATE phases SET title = ?, updated_at = ? WHERE id = ?")
      .run(title, now, id);

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.query("DELETE FROM phases WHERE id = ?").run(id);
    return result.changes > 0;
  }

  reorder(workflowId: string, orderedIds: string[]): void {
    this.db.transaction(() => {
      // First pass: set to negative positions to avoid unique constraint conflicts
      for (let i = 0; i < orderedIds.length; i++) {
        this.db
          .query("UPDATE phases SET position = ? WHERE id = ? AND workflow_id = ?")
          .run(-(i + 1), orderedIds[i], workflowId);
      }
      // Second pass: set to final positive positions
      const now = new Date().toISOString();
      for (let i = 0; i < orderedIds.length; i++) {
        this.db
          .query("UPDATE phases SET position = ?, updated_at = ? WHERE id = ? AND workflow_id = ?")
          .run(i, now, orderedIds[i], workflowId);
      }
    })();
  }
}
