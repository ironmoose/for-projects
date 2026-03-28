import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Action } from "../entities";
import type { CreateActionInput, UpdateActionInput } from "../inputs";

export class ActionRepository {
  constructor(private db: Database) {}

  findByTarget(target: string, limit?: number, offset?: number, status?: string): Action[] {
    if (status) {
      if (limit !== undefined && offset !== undefined) {
        return this.db
          .query("SELECT * FROM actions WHERE target = ? AND status = ? ORDER BY rank ASC LIMIT ? OFFSET ?")
          .all(target, status, limit, offset) as Action[];
      }
      return this.db
        .query("SELECT * FROM actions WHERE target = ? AND status = ? ORDER BY rank ASC")
        .all(target, status) as Action[];
    }
    if (limit !== undefined && offset !== undefined) {
      return this.db
        .query("SELECT * FROM actions WHERE target = ? ORDER BY rank ASC LIMIT ? OFFSET ?")
        .all(target, limit, offset) as Action[];
    }
    return this.db
      .query("SELECT * FROM actions WHERE target = ? ORDER BY rank ASC")
      .all(target) as Action[];
  }

  countByTarget(target: string, status?: string): number {
    if (status) {
      return (this.db.query(
        "SELECT COUNT(*) as total FROM actions WHERE target = ? AND status = ?"
      ).get(target, status) as { total: number }).total;
    }
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
            `INSERT INTO actions (id, target, rank, prompt, agent, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            id,
            action.target,
            action.rank,
            action.prompt,
            action.agent ?? null,
            action.status ?? 'todo',
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

  findExecutableActions(target: string): Action[] {
    return this.db
      .query(
        `SELECT * FROM actions WHERE target = ? AND rank = (
          SELECT MIN(rank) FROM actions WHERE target = ? AND status NOT IN ('complete', 'failed')
        ) ORDER BY id ASC`
      )
      .all(target, target) as Action[];
  }

  isTierComplete(target: string, rank: number): boolean {
    const row = this.db
      .query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('complete', 'failed') THEN 1 ELSE 0 END) as terminal
         FROM actions WHERE target = ? AND rank = ?`
      )
      .get(target, rank) as { total: number; terminal: number };
    return row.total > 0 && row.total === row.terminal;
  }

  findByTargetGroupedByRank(target: string): Map<number, Action[]> {
    const rows = this.db
      .query("SELECT * FROM actions WHERE target = ? ORDER BY rank ASC, id ASC")
      .all(target) as Action[];

    const grouped = new Map<number, Action[]>();
    for (const row of rows) {
      const existing = grouped.get(row.rank);
      if (existing) {
        existing.push(row);
      } else {
        grouped.set(row.rank, [row]);
      }
    }
    return grouped;
  }

  findRecentlyTerminal(limit = 10): Action[] {
    return this.db
      .query(
        "SELECT * FROM actions WHERE status IN ('complete', 'failed') ORDER BY updated_at DESC LIMIT ?"
      )
      .all(limit) as Action[];
  }

  countByStatus(target: string): Record<string, number> {
    const rows = this.db
      .query("SELECT status, COUNT(*) as count FROM actions WHERE target = ? GROUP BY status")
      .all(target) as { status: string; count: number }[];

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result;
  }

  updateStatus(id: string, status: string): Action | null {
    const now = new Date().toISOString();
    this.db
      .query("UPDATE actions SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, now, id);
    return this.findById(id);
  }

  /** Get all distinct targets that have at least one non-terminal action */
  findActiveTargets(): string[] {
    const rows = this.db
      .query("SELECT DISTINCT target FROM actions WHERE status NOT IN ('complete', 'failed')")
      .all() as { target: string }[];
    return rows.map((r) => r.target);
  }

  /** Find all actions with a given status */
  findByStatus(status: string, limit = 100): Action[] {
    return this.db
      .query("SELECT * FROM actions WHERE status = ? ORDER BY updated_at DESC LIMIT ?")
      .all(status, limit) as Action[];
  }
}
