import type { Sql, Fragment } from "postgres";
import { ulid } from "ulid";
import type { ActivityLog } from "../../entities";

export interface InsertActivityLog {
  entity_type: string;
  entity_id: string | null;
  action: string;
  summary: string;
}

export class PgActivityLogRepository {
  constructor(private sql: Sql) {}

  async insert(row: InsertActivityLog): Promise<ActivityLog> {
    const id = ulid();
    const now = new Date().toISOString();
    await this.sql`
      INSERT INTO activity_log (id, entity_type, entity_id, action, summary, created_at)
      VALUES (${id}, ${row.entity_type}, ${row.entity_id}, ${row.action}, ${row.summary}, ${now})
    `;
    const rows = await this.sql<ActivityLog[]>`SELECT * FROM activity_log WHERE id = ${id}`;
    return rows[0];
  }

  async findMany(filter?: { entity_type?: string; entity_id?: string; limit?: number; offset?: number }): Promise<ActivityLog[]> {
    const limit = filter?.limit ?? 50;
    const offset = filter?.offset ?? 0;
    const where = this.where(filter);
    return this.sql<ActivityLog[]>`
      SELECT * FROM activity_log ${where}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async count(filter?: { entity_type?: string; entity_id?: string }): Promise<number> {
    const where = this.where(filter);
    const [row] = await this.sql<[{ total: string }]>`SELECT COUNT(*) as total FROM activity_log ${where}`;
    return Number(row.total);
  }

  async countAll(): Promise<number> {
    const [row] = await this.sql<[{ total: string }]>`SELECT COUNT(*) as total FROM activity_log`;
    return Number(row.total);
  }

  async deleteOlderThan(cutoffDate: string): Promise<number> {
    const result = await this.sql`DELETE FROM activity_log WHERE created_at < ${cutoffDate}`;
    return result.count;
  }

  private where(filter?: { entity_type?: string; entity_id?: string }): Fragment {
    const conditions: Fragment[] = [];
    if (filter?.entity_type) conditions.push(this.sql`entity_type = ${filter.entity_type}`);
    if (filter?.entity_id) conditions.push(this.sql`entity_id = ${filter.entity_id}`);
    return conditions.length > 0
      ? this.sql`WHERE ${conditions.reduce((a, b) => this.sql`${a} AND ${b}`)}`
      : this.sql``;
  }
}
