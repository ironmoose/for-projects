import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Task, TaskSummary, GraphTaskSummary, TaskStatus, EffortLevel, ImpactLevel, TaskCategory } from "../entities";

export interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  summary: string | null;
  context: string | null;
  acceptance_criteria: string | null;
  group_key: string | null;
  status: string;
  effort: string | null;
  impact: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

type TaskFilter = { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string[]; effort?: string; impact?: string; category?: string; title?: string; blocked?: boolean };

/** SQLite stores booleans as 0/1; normalize to JS boolean. */
function normalizeTask(row: Record<string, unknown>): Task {
  return { ...row, is_blocked: !!row.is_blocked } as Task;
}

export class TaskRepository {
  constructor(private db: Database) {}

  private buildWhereClause(filter?: TaskFilter): { where: string; params: (string | number)[] } {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.id) {
      conditions.push("id = ?");
      params.push(filter.id);
    }
    if (filter?.project_id) {
      conditions.push("project_id = ?");
      params.push(filter.project_id);
    }
    if (filter?.group_key) {
      conditions.push("group_key = ?");
      params.push(filter.group_key);
    }
    if (filter?.status && filter.status.length > 0) {
      if (filter.status.length === 1) {
        conditions.push("status = ?"); params.push(filter.status[0]);
      } else {
        conditions.push(`status IN (${filter.status.map(() => "?").join(", ")})`);
        params.push(...filter.status);
      }
    }
    if (filter?.effort) {
      conditions.push("effort = ?");
      params.push(filter.effort);
    }
    if (filter?.impact) {
      conditions.push("impact = ?");
      params.push(filter.impact);
    }
    if (filter?.category) {
      conditions.push("category = ?");
      params.push(filter.category);
    }
    if (filter?.title) {
      conditions.push("title LIKE ?");
      params.push(`%${filter.title}%`);
    }
    if (filter?.blocked !== undefined) {
      conditions.push("is_blocked = ?");
      params.push(filter.blocked ? 1 : 0);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    return { where, params };
  }

  findById(id: string): Task | null {
    const row = this.db.query("SELECT * FROM tasks WHERE id = ?").get(id) as Record<string, unknown> | null;
    return row ? normalizeTask(row) : null;
  }

  findMany(filter?: TaskFilter): Task[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const { where, params } = this.buildWhereClause(filter);
    params.push(limit, offset);

    const rows = this.db
      .query(`SELECT * FROM tasks ${where}ORDER BY created_at ASC LIMIT ? OFFSET ?`)
      .all(...params) as Record<string, unknown>[];
    return rows.map(normalizeTask);
  }

  findManySummary(filter?: TaskFilter): TaskSummary[] {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const { where, params } = this.buildWhereClause(filter);
    params.push(limit, offset);

    const rows = this.db
      .query(`SELECT id, project_id, title, summary, status, effort, impact, category, group_key, (context IS NOT NULL) AS has_context, (acceptance_criteria IS NOT NULL) AS has_acceptance_criteria, is_blocked, created_at, updated_at FROM tasks ${where}ORDER BY created_at ASC LIMIT ? OFFSET ?`)
      .all(...params) as (Omit<TaskSummary, "has_context" | "has_acceptance_criteria" | "is_blocked"> & { has_context: number; has_acceptance_criteria: number; is_blocked: number })[];

    return rows.map((r) => ({
      ...r,
      has_context: !!r.has_context,
      has_acceptance_criteria: !!r.has_acceptance_criteria,
      is_blocked: !!r.is_blocked,
    })) as TaskSummary[];
  }

  /** Lightweight query for dependency graph -- no TEXT columns, no LIMIT. */
  findGraphSummaries(projectId: string, status?: string[]): GraphTaskSummary[] {
    if (status && status.length > 0) {
      const placeholders = status.map(() => "?").join(", ");
      return this.db
        .query(`SELECT id, title, status, group_key FROM tasks WHERE project_id = ? AND status IN (${placeholders}) ORDER BY created_at ASC`)
        .all(projectId, ...status) as GraphTaskSummary[];
    }
    return this.db
      .query("SELECT id, title, status, group_key FROM tasks WHERE project_id = ? ORDER BY created_at ASC")
      .all(projectId) as GraphTaskSummary[];
  }

  count(filter?: TaskFilter): number {
    const { where, params } = this.buildWhereClause(filter);

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM tasks ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  insertMany(rows: Omit<TaskRow, "id" | "created_at" | "updated_at">[]): Task[] {
    const stmt = this.db.query(
      "INSERT INTO tasks (id, project_id, title, summary, context, acceptance_criteria, group_key, status, effort, impact, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const row of rows) {
      const id = ulid();
      ids.push(id);
      stmt.run(id, row.project_id, row.title, row.summary ?? null, row.context ?? null, row.acceptance_criteria ?? null, row.group_key ?? null, row.status, row.effort ?? null, row.impact ?? null, row.category ?? null, now, now);
    }

    const results: Task[] = [];
    for (let i = 0; i < rows.length; i++) {
      results.push({
        id: ids[i],
        project_id: rows[i].project_id,
        title: rows[i].title,
        summary: rows[i].summary ?? null,
        context: rows[i].context ?? null,
        acceptance_criteria: rows[i].acceptance_criteria ?? null,
        group_key: rows[i].group_key ?? null,
        status: rows[i].status as TaskStatus,
        effort: (rows[i].effort ?? null) as EffortLevel | null,
        impact: (rows[i].impact ?? null) as ImpactLevel | null,
        category: (rows[i].category ?? null) as TaskCategory | null,
        is_blocked: false,
        created_at: now,
        updated_at: now,
      });
    }
    return results;
  }

  updateMany(rows: { id: string; title?: string; summary?: string | null; context?: string | null; acceptance_criteria?: string | null; group_key?: string | null; status?: string; effort?: string | null; impact?: string | null; category?: string | null; is_blocked?: boolean }[]): Task[] {
    const now = new Date().toISOString();
    const results: Task[] = [];

    for (const row of rows) {
      const existing = this.findById(row.id);
      if (!existing) continue;

      const title = row.title !== undefined ? row.title : existing.title;
      const summary = row.summary !== undefined ? row.summary : existing.summary;
      const context = row.context !== undefined ? row.context : existing.context;
      const acceptance_criteria = row.acceptance_criteria !== undefined ? row.acceptance_criteria : existing.acceptance_criteria;
      const group_key = row.group_key !== undefined ? row.group_key : existing.group_key;
      const status = row.status !== undefined ? row.status : existing.status;
      const effort = row.effort !== undefined ? row.effort : existing.effort;
      const impact = row.impact !== undefined ? row.impact : existing.impact;
      const category = row.category !== undefined ? row.category : existing.category;
      const is_blocked = row.is_blocked !== undefined ? row.is_blocked : existing.is_blocked;

      this.db
        .query("UPDATE tasks SET title = ?, summary = ?, context = ?, acceptance_criteria = ?, group_key = ?, status = ?, effort = ?, impact = ?, category = ?, is_blocked = ?, updated_at = ? WHERE id = ?")
        .run(title, summary, context, acceptance_criteria, group_key, status, effort, impact, category, is_blocked ? 1 : 0, now, row.id);

      results.push({
        id: row.id,
        project_id: existing.project_id,
        title,
        summary,
        context,
        acceptance_criteria,
        group_key,
        status: status as TaskStatus,
        effort: (effort ?? null) as EffortLevel | null,
        impact: (impact ?? null) as ImpactLevel | null,
        category: (category ?? null) as TaskCategory | null,
        is_blocked,
        created_at: existing.created_at,
        updated_at: now,
      });
    }

    return results;
  }

  getStatusCountsByProject(projectIds: string[]): Record<string, Record<string, number>> {
    if (projectIds.length === 0) return {};
    const placeholders = projectIds.map(() => "?").join(", ");
    const rows = this.db
      .query(`SELECT project_id, status, COUNT(*) as count FROM tasks WHERE project_id IN (${placeholders}) GROUP BY project_id, status`)
      .all(...projectIds) as { project_id: string; status: string; count: number }[];

    const result: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      if (!result[row.project_id]) result[row.project_id] = {};
      result[row.project_id][row.status] = row.count;
    }
    return result;
  }

  deleteMany(ids: string[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(", ");
    this.db.query(`DELETE FROM tasks WHERE id IN (${placeholders})`).run(...ids);
  }
}
