import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Action } from "../entities";
import type { CreateActionInput, UpdateActionInput } from "../inputs";

export class ActionRepository {
  constructor(private db: Database) {}

  findByTarget(target: string, limit?: number, offset?: number): Action[] {
    if (limit !== undefined && offset !== undefined) {
      return this.db
        .query("SELECT * FROM actions WHERE target = ? ORDER BY rank ASC LIMIT ? OFFSET ?")
        .all(target, limit, offset) as Action[];
    }
    return this.db
      .query("SELECT * FROM actions WHERE target = ? ORDER BY rank ASC")
      .all(target) as Action[];
  }

  countByTarget(target: string): number {
    return (this.db.query(
      "SELECT COUNT(*) as total FROM actions WHERE target = ?"
    ).get(target) as { total: number }).total;
  }

  findById(id: string): Action | null {
    return this.db.query("SELECT * FROM actions WHERE id = ?").get(id) as Action | null;
  }

  createMany(actions: CreateActionInput[]): Action[] {
    const ids: string[] = [];

    this.db.transaction(() => {
      const now = new Date().toISOString();
      for (const action of actions) {
        const id = ulid();
        ids.push(id);
        this.db
          .query(
            `INSERT INTO actions (id, target, rank, template_id, prompt, agent, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            id,
            action.target,
            action.rank,
            action.template_id ?? null,
            action.prompt,
            action.agent ?? null,
            now,
            now
          );
      }
    })();

    return ids.map((id) => this.findById(id)!);
  }

  updateMany(updates: UpdateActionInput[]): Action[] {
    const results: Action[] = [];

    this.db.transaction(() => {
      const now = new Date().toISOString();
      for (const update of updates) {
        const existing = this.findById(update.id);
        if (!existing) continue;

        const prompt = update.prompt ?? existing.prompt;
        const agent = update.agent !== undefined ? update.agent : existing.agent;

        this.db
          .query("UPDATE actions SET prompt = ?, agent = ?, updated_at = ? WHERE id = ?")
          .run(prompt, agent, now, update.id);

        results.push(this.findById(update.id)!);
      }
    })();

    return results;
  }

  deleteMany(ids: string[]): number {
    let deleted = 0;

    this.db.transaction(() => {
      for (const id of ids) {
        const result = this.db.query("DELETE FROM actions WHERE id = ?").run(id);
        deleted += result.changes;
      }
    })();

    return deleted;
  }
}
