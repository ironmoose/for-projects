import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { ActionLogEntry, ActionLogStatus, EntityType } from "../entities";

export interface ActionLogRow {
  id: string;
  action_id: string;
  entity_type: EntityType;
  entity_id: string;
  status: ActionLogStatus;
  output: string | null;
  started_at: string;
  finished_at: string | null;
}

export class ActionLogRepository {
  constructor(private db: Database) {}

  findById(id: string): ActionLogEntry | null {
    return this.db.query("SELECT * FROM action_log WHERE id = ?").get(id) as ActionLogEntry | null;
  }

  findMany(filter?: {
    id?: string;
    limit?: number;
    offset?: number;
    entity_type?: EntityType;
    entity_id?: string;
    action_id?: string;
    status?: ActionLogStatus;
    started_after?: string;
    finished_after?: string;
  }): ActionLogEntry[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.entity_type) {
      conditions.push("entity_type = ?");
      params.push(filter.entity_type);
    }
    if (filter?.entity_id) {
      conditions.push("entity_id = ?");
      params.push(filter.entity_id);
    }
    if (filter?.action_id) {
      conditions.push("action_id = ?");
      params.push(filter.action_id);
    }
    if (filter?.status) {
      conditions.push("status = ?");
      params.push(filter.status);
    }
    if (filter?.started_after) {
      conditions.push("started_at >= ?");
      params.push(filter.started_after);
    }
    if (filter?.finished_after) {
      conditions.push("finished_at >= ?");
      params.push(filter.finished_after);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    return this.db
      .query(`SELECT * FROM action_log ${where}ORDER BY started_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as ActionLogEntry[];
  }

  count(filter?: {
    id?: string;
    entity_type?: EntityType;
    entity_id?: string;
    action_id?: string;
    status?: ActionLogStatus;
    started_after?: string;
    finished_after?: string;
  }): number {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.entity_type) {
      conditions.push("entity_type = ?");
      params.push(filter.entity_type);
    }
    if (filter?.entity_id) {
      conditions.push("entity_id = ?");
      params.push(filter.entity_id);
    }
    if (filter?.action_id) {
      conditions.push("action_id = ?");
      params.push(filter.action_id);
    }
    if (filter?.status) {
      conditions.push("status = ?");
      params.push(filter.status);
    }
    if (filter?.started_after) {
      conditions.push("started_at >= ?");
      params.push(filter.started_after);
    }
    if (filter?.finished_after) {
      conditions.push("finished_at >= ?");
      params.push(filter.finished_after);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM action_log ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  insertMany(rows: Omit<ActionLogRow, "id">[]): ActionLogEntry[] {
    const stmt = this.db.query(
      "INSERT INTO action_log (id, action_id, entity_type, entity_id, status, output, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.action_id, row.entity_type, row.entity_id, row.status, row.output, row.started_at, row.finished_at);
    }

    return ids.map((id) => this.findById(id)!);
  }

  updateMany(rows: { id: string; status?: ActionLogStatus; output?: string | null; finished_at?: string | null }[]): ActionLogEntry[] {
    const results: ActionLogEntry[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const status = row.status !== undefined ? row.status : existing.status;
      const output = row.output !== undefined ? row.output : existing.output;
      const finished_at = row.finished_at !== undefined ? row.finished_at : existing.finished_at;

      this.db
        .query("UPDATE action_log SET status = ?, output = ?, finished_at = ? WHERE id = ?")
        .run(status, output, finished_at, row.id);

      results.push(this.findById(row.id)!);
    }

    return results;
  }
}
