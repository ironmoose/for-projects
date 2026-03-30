import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Run, RunStatus, RunStats, RunDailyStats, RunSummaryStats, EntityType } from "../entities";

export interface RunRow {
  id: string;
  agent: string;
  entity_type: EntityType;
  entity_id: string;
  session_id: string | null;
  status: RunStatus;
  output: string | null;
  started_at: string;
  finished_at: string | null;
}

export class RunRepository {
  constructor(private db: Database) {}

  findById(id: string): Run | null {
    return this.db.query("SELECT * FROM runs WHERE id = ?").get(id) as Run | null;
  }

  findMany(filter?: {
    id?: string;
    limit?: number;
    offset?: number;
    entity_type?: EntityType;
    entity_id?: string;
    session_id?: string;
    agent?: string;
    agent_identifier?: string;
    status?: RunStatus;
    search?: string;
    started_after?: string;
    started_before?: string;
    finished_after?: string;
  }): Run[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    const needsJoin = !!filter?.agent_identifier;

    if (filter?.id) {
      conditions.push("runs.id = ?");
      params.push(filter.id);
    }
    if (filter?.session_id) {
      conditions.push("runs.session_id = ?");
      params.push(filter.session_id);
    }
    if (filter?.entity_type) {
      conditions.push("runs.entity_type = ?");
      params.push(filter.entity_type);
    }
    if (filter?.entity_id) {
      conditions.push("runs.entity_id = ?");
      params.push(filter.entity_id);
    }
    if (filter?.agent) {
      conditions.push("runs.agent = ?");
      params.push(filter.agent);
    }
    if (filter?.status) {
      conditions.push("runs.status = ?");
      params.push(filter.status);
    }
    if (filter?.search) {
      conditions.push("runs.output LIKE ?");
      params.push(`%${filter.search}%`);
    }
    if (filter?.started_after) {
      conditions.push("runs.started_at >= ?");
      params.push(filter.started_after);
    }
    if (filter?.started_before) {
      conditions.push("runs.started_at <= ?");
      params.push(filter.started_before);
    }
    if (filter?.finished_after) {
      conditions.push("runs.finished_at >= ?");
      params.push(filter.finished_after);
    }
    if (filter?.agent_identifier) {
      conditions.push("a.identifier = ?");
      params.push(filter.agent_identifier);
    }

    const join = needsJoin ? "LEFT JOIN agents a ON runs.agent = a.identifier " : "";
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    return this.db
      .query(`SELECT runs.* FROM runs ${join}${where}ORDER BY runs.started_at DESC LIMIT ? OFFSET ?`)
      .all(...params) as Run[];
  }

  count(filter?: {
    id?: string;
    entity_type?: EntityType;
    entity_id?: string;
    session_id?: string;
    agent?: string;
    agent_identifier?: string;
    status?: RunStatus;
    search?: string;
    started_after?: string;
    started_before?: string;
    finished_after?: string;
  }): number {
    const conditions: string[] = [];
    const params: string[] = [];
    const needsJoin = !!filter?.agent_identifier;

    if (filter?.id) {
      conditions.push("runs.id = ?");
      params.push(filter.id);
    }
    if (filter?.session_id) {
      conditions.push("runs.session_id = ?");
      params.push(filter.session_id);
    }
    if (filter?.entity_type) {
      conditions.push("runs.entity_type = ?");
      params.push(filter.entity_type);
    }
    if (filter?.entity_id) {
      conditions.push("runs.entity_id = ?");
      params.push(filter.entity_id);
    }
    if (filter?.agent) {
      conditions.push("runs.agent = ?");
      params.push(filter.agent);
    }
    if (filter?.status) {
      conditions.push("runs.status = ?");
      params.push(filter.status);
    }
    if (filter?.search) {
      conditions.push("runs.output LIKE ?");
      params.push(`%${filter.search}%`);
    }
    if (filter?.started_after) {
      conditions.push("runs.started_at >= ?");
      params.push(filter.started_after);
    }
    if (filter?.started_before) {
      conditions.push("runs.started_at <= ?");
      params.push(filter.started_before);
    }
    if (filter?.finished_after) {
      conditions.push("runs.finished_at >= ?");
      params.push(filter.finished_after);
    }
    if (filter?.agent_identifier) {
      conditions.push("a.identifier = ?");
      params.push(filter.agent_identifier);
    }

    const join = needsJoin ? "LEFT JOIN agents a ON runs.agent = a.identifier " : "";
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM runs ${join}${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  stats(): RunStats {
    const byStatus = this.db
      .query("SELECT status, COUNT(*) as count FROM runs GROUP BY status ORDER BY status")
      .all() as { status: RunStatus; count: number }[];

    const byAgent = this.db
      .query("SELECT runs.agent, COUNT(*) as count FROM runs GROUP BY runs.agent ORDER BY runs.agent")
      .all() as { agent: string; count: number }[];

    const totalRow = this.db
      .query("SELECT COUNT(*) as total FROM runs")
      .get() as { total: number };

    return {
      by_status: byStatus,
      by_agent: byAgent,
      total: totalRow.total,
    };
  }

  insertMany(rows: Omit<RunRow, "id">[]): Run[] {
    const stmt = this.db.query(
      "INSERT INTO runs (id, agent, entity_type, entity_id, session_id, status, output, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.agent, row.entity_type, row.entity_id, row.session_id, row.status, row.output, row.started_at, row.finished_at);
    }

    return ids.map((id) => this.findById(id)!);
  }

  getDaily(days: number): RunDailyStats[] {
    return this.db
      .query(
        `SELECT date(runs.started_at) AS date, runs.status, runs.agent, COUNT(*) AS count,
  AVG(CASE WHEN runs.finished_at IS NOT NULL THEN (julianday(runs.finished_at) - julianday(runs.started_at)) * 86400000 ELSE NULL END) AS avg_duration_ms
FROM runs LEFT JOIN agents a ON runs.agent = a.identifier
WHERE runs.started_at >= date('now', '-' || ? || ' days')
GROUP BY date(runs.started_at), runs.status, runs.agent ORDER BY date ASC`,
      )
      .all(days) as RunDailyStats[];
  }

  getSummary(): RunSummaryStats {
    const row = this.db
      .query(
        `SELECT COUNT(*) AS total,
  SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
  SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
  SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) AS todo,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
  AVG(CASE WHEN finished_at IS NOT NULL THEN (julianday(finished_at) - julianday(started_at)) * 86400000 ELSE NULL END) AS avg_duration_ms
FROM runs`,
      )
      .get() as RunSummaryStats | null;

    return row ?? { total: 0, done: 0, failed: 0, running: 0, todo: 0, cancelled: 0, avg_duration_ms: null };
  }

  updateMany(rows: { id: string; status?: RunStatus; output?: string | null; finished_at?: string | null }[]): Run[] {
    const results: Run[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const status = row.status !== undefined ? row.status : existing.status;
      const output = row.output !== undefined ? row.output : existing.output;
      const finished_at = row.finished_at !== undefined ? row.finished_at : existing.finished_at;

      this.db
        .query("UPDATE runs SET status = ?, output = ?, finished_at = ? WHERE id = ?")
        .run(status, output, finished_at, row.id);

      results.push(this.findById(row.id)!);
    }

    return results;
  }

  deleteMany(ids: string[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM runs WHERE id IN (${placeholders})`).run(...ids);
  }
}
