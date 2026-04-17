import type { Sql, Fragment } from "postgres";
import { ulid } from "ulid";
import type { Task, TaskSummary, GraphTaskSummary, TaskStatus, EffortLevel, ImpactLevel, TaskCategory } from "../../entities";

type TaskFilter = {
  id?: string; limit?: number; offset?: number; project_id?: string;
  group_key?: string; status?: string[]; effort?: string; impact?: string;
  category?: string; title?: string; blocked?: boolean;
};

export class PgTaskRepository {
  constructor(private sql: Sql) {}

  private where(filter?: TaskFilter): Fragment {
    const c: Fragment[] = [];
    if (filter?.id) c.push(this.sql`id = ${filter.id}`);
    if (filter?.project_id) c.push(this.sql`project_id = ${filter.project_id}`);
    if (filter?.group_key) c.push(this.sql`group_key = ${filter.group_key}`);
    if (filter?.status && filter.status.length > 0) {
      c.push(this.sql`status IN ${this.sql(filter.status)}`);
    }
    if (filter?.effort) c.push(this.sql`effort = ${filter.effort}`);
    if (filter?.impact) c.push(this.sql`impact = ${filter.impact}`);
    if (filter?.category) c.push(this.sql`category = ${filter.category}`);
    if (filter?.title) c.push(this.sql`title ILIKE ${"%" + filter.title + "%"}`);
    if (filter?.blocked !== undefined) c.push(this.sql`is_blocked = ${filter.blocked}`);
    return c.length > 0
      ? this.sql`WHERE ${c.reduce((a, b) => this.sql`${a} AND ${b}`)}`
      : this.sql``;
  }

  async findById(id: string): Promise<Task | null> {
    // Explicit column list — never `SELECT *`. The `embedding` column is internal
    // (vector(768) used only for semantic search) and must never leak into API
    // or MCP responses.
    const rows = await this.sql<Task[]>`
      SELECT id, project_id, title, summary, context, acceptance_criteria,
        group_key, status, effort, impact, category, is_blocked,
        created_at, updated_at
      FROM tasks WHERE id = ${id}
    `;
    return rows[0] ?? null;
  }

  async findMany(filter?: TaskFilter): Promise<Task[]> {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    return this.sql<Task[]>`
      SELECT id, project_id, title, summary, context, acceptance_criteria,
        group_key, status, effort, impact, category, is_blocked,
        created_at, updated_at
      FROM tasks ${this.where(filter)}
      ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async findManySummary(filter?: TaskFilter): Promise<TaskSummary[]> {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const rows = await this.sql<(TaskSummary & { has_context: boolean; has_acceptance_criteria: boolean })[]>`
      SELECT id, project_id, title, summary, status, effort, impact, category, group_key,
        (context IS NOT NULL) AS has_context,
        (acceptance_criteria IS NOT NULL) AS has_acceptance_criteria,
        is_blocked, created_at, updated_at
      FROM tasks ${this.where(filter)}
      ORDER BY created_at ASC LIMIT ${limit} OFFSET ${offset}
    `;
    return rows as TaskSummary[];
  }

  async findGraphSummaries(projectId: string, status?: string[]): Promise<GraphTaskSummary[]> {
    if (status && status.length > 0) {
      return this.sql<GraphTaskSummary[]>`
        SELECT id, title, status, group_key FROM tasks
        WHERE project_id = ${projectId} AND status IN ${this.sql(status)}
        ORDER BY created_at ASC
      `;
    }
    return this.sql<GraphTaskSummary[]>`
      SELECT id, title, status, group_key FROM tasks
      WHERE project_id = ${projectId}
      ORDER BY created_at ASC
    `;
  }

  async count(filter?: TaskFilter): Promise<number> {
    const [row] = await this.sql<[{ total: string }]>`SELECT COUNT(*) as total FROM tasks ${this.where(filter)}`;
    return Number(row.total);
  }

  async insertMany(rows: {
    project_id: string; title: string; summary?: string | null;
    context?: string | null; acceptance_criteria?: string | null;
    group_key?: string | null; status: string;
    effort?: string | null; impact?: string | null; category?: string | null;
  }[]): Promise<Task[]> {
    const now = new Date().toISOString();
    const results: Task[] = [];

    for (const row of rows) {
      const id = ulid();
      await this.sql`
        INSERT INTO tasks (id, project_id, title, summary, context, acceptance_criteria, group_key, status, effort, impact, category, is_blocked, created_at, updated_at)
        VALUES (${id}, ${row.project_id}, ${row.title}, ${row.summary ?? null}, ${row.context ?? null}, ${row.acceptance_criteria ?? null}, ${row.group_key ?? null}, ${row.status}, ${row.effort ?? null}, ${row.impact ?? null}, ${row.category ?? null}, ${false}, ${now}, ${now})
      `;
      results.push({
        id, project_id: row.project_id, title: row.title,
        summary: row.summary ?? null, context: row.context ?? null,
        acceptance_criteria: row.acceptance_criteria ?? null,
        group_key: row.group_key ?? null,
        status: row.status as TaskStatus,
        effort: (row.effort ?? null) as EffortLevel | null,
        impact: (row.impact ?? null) as ImpactLevel | null,
        category: (row.category ?? null) as TaskCategory | null,
        is_blocked: false, created_at: now, updated_at: now,
      });
    }
    return results;
  }

  async updateMany(rows: {
    id: string; title?: string; summary?: string | null;
    context?: string | null; acceptance_criteria?: string | null;
    group_key?: string | null; status?: string;
    effort?: string | null; impact?: string | null; category?: string | null;
    is_blocked?: boolean;
  }[]): Promise<Task[]> {
    const now = new Date().toISOString();
    const results: Task[] = [];

    for (const row of rows) {
      const existing = await this.findById(row.id);
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

      await this.sql`
        UPDATE tasks SET title = ${title}, summary = ${summary}, context = ${context},
          acceptance_criteria = ${acceptance_criteria}, group_key = ${group_key},
          status = ${status}, effort = ${effort}, impact = ${impact}, category = ${category},
          is_blocked = ${is_blocked}, updated_at = ${now}
        WHERE id = ${row.id}
      `;

      results.push({
        id: row.id, project_id: existing.project_id, title, summary, context,
        acceptance_criteria, group_key,
        status: status as TaskStatus,
        effort: (effort ?? null) as EffortLevel | null,
        impact: (impact ?? null) as ImpactLevel | null,
        category: (category ?? null) as TaskCategory | null,
        is_blocked, created_at: existing.created_at, updated_at: now,
      });
    }
    return results;
  }

  async getStatusCountsByProject(projectIds: string[]): Promise<Record<string, Record<string, number>>> {
    if (projectIds.length === 0) return {};
    const rows = await this.sql<{ project_id: string; status: string; count: string }[]>`
      SELECT project_id, status, COUNT(*) as count FROM tasks
      WHERE project_id IN ${this.sql(projectIds)}
      GROUP BY project_id, status
    `;
    const result: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      if (!result[row.project_id]) result[row.project_id] = {};
      result[row.project_id][row.status] = Number(row.count);
    }
    return result;
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.sql`DELETE FROM tasks WHERE id IN ${this.sql(ids)}`;
  }
}
