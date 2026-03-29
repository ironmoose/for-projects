import type { Database } from "bun:sqlite";
import type { EntityAction } from "../entities";

export class EntityActionRepository {
  constructor(private db: Database) {}

  link(input: {
    entity_type: string;
    entity_id: string;
    role: string;
    action_id: string;
    status: string;
    output: string | null;
    created_at: string;
    updated_at: string;
  }): void {
    this.db
      .query(
        "INSERT INTO entity_actions (entity_type, entity_id, role, action_id, status, output, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        input.entity_type,
        input.entity_id,
        input.role,
        input.action_id,
        input.status,
        input.output,
        input.created_at,
        input.updated_at
      );
  }

  unlink(entity_type: string, entity_id: string, role: string): boolean {
    const result = this.db
      .query("DELETE FROM entity_actions WHERE entity_type = ? AND entity_id = ? AND role = ?")
      .run(entity_type, entity_id, role);
    return result.changes > 0;
  }

  findByEntity(entity_type: string, entity_id: string): EntityAction[] {
    return this.db
      .query("SELECT * FROM entity_actions WHERE entity_type = ? AND entity_id = ? ORDER BY role")
      .all(entity_type, entity_id) as EntityAction[];
  }

  findByEntityAndRole(entity_type: string, entity_id: string, role: string): EntityAction | null {
    return this.db
      .query("SELECT * FROM entity_actions WHERE entity_type = ? AND entity_id = ? AND role = ?")
      .get(entity_type, entity_id, role) as EntityAction | null;
  }

  updateStatus(
    entity_type: string,
    entity_id: string,
    role: string,
    status: string,
    updated_at: string
  ): EntityAction | null {
    return this.db
      .query(
        "UPDATE entity_actions SET status = ?, updated_at = ? WHERE entity_type = ? AND entity_id = ? AND role = ? RETURNING *"
      )
      .get(status, updated_at, entity_type, entity_id, role) as EntityAction | null;
  }

  updateOutput(
    entity_type: string,
    entity_id: string,
    role: string,
    output: string | null,
    updated_at: string
  ): EntityAction | null {
    return this.db
      .query(
        "UPDATE entity_actions SET output = ?, updated_at = ? WHERE entity_type = ? AND entity_id = ? AND role = ? RETURNING *"
      )
      .get(output, updated_at, entity_type, entity_id, role) as EntityAction | null;
  }

  findAll(
    limit: number,
    offset: number,
    filters?: { entity_type?: string; entity_id?: string; role?: string; status?: string }
  ): EntityAction[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filters?.entity_type) {
      conditions.push("entity_type = ?");
      params.push(filters.entity_type);
    }
    if (filters?.entity_id) {
      conditions.push("entity_id = ?");
      params.push(filters.entity_id);
    }
    if (filters?.role) {
      conditions.push("role = ?");
      params.push(filters.role);
    }
    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";
    params.push(limit, offset);

    return this.db
      .query(`SELECT * FROM entity_actions ${where}ORDER BY created_at ASC LIMIT ? OFFSET ?`)
      .all(...params) as EntityAction[];
  }

  count(filters?: { entity_type?: string; entity_id?: string; role?: string; status?: string }): number {
    const conditions: string[] = [];
    const params: string[] = [];

    if (filters?.entity_type) {
      conditions.push("entity_type = ?");
      params.push(filters.entity_type);
    }
    if (filters?.entity_id) {
      conditions.push("entity_id = ?");
      params.push(filters.entity_id);
    }
    if (filters?.role) {
      conditions.push("role = ?");
      params.push(filters.role);
    }
    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")} ` : "";

    return (
      this.db
        .query(`SELECT COUNT(*) as total FROM entity_actions ${where}`)
        .get(...params) as { total: number }
    ).total;
  }

  claimNext(
    entity_type: string,
    entity_id: string,
    role: string,
    updated_at: string
  ): EntityAction | null {
    return this.db
      .query(
        "UPDATE entity_actions SET status = 'in_progress', updated_at = ? WHERE entity_type = ? AND entity_id = ? AND role = ? AND status = 'todo' RETURNING *"
      )
      .get(updated_at, entity_type, entity_id, role) as EntityAction | null;
  }

  revertStale(cutoff: string, updated_at: string): EntityAction[] {
    return this.db
      .query(
        "UPDATE entity_actions SET status = 'todo', updated_at = ? WHERE status = 'in_progress' AND updated_at < ? RETURNING *"
      )
      .all(updated_at, cutoff) as EntityAction[];
  }

  findByActionId(action_id: string): EntityAction[] {
    return this.db
      .query("SELECT * FROM entity_actions WHERE action_id = ?")
      .all(action_id) as EntityAction[];
  }

  deleteByEntity(entity_type: string, entity_id: string): number {
    const result = this.db
      .query("DELETE FROM entity_actions WHERE entity_type = ? AND entity_id = ?")
      .run(entity_type, entity_id);
    return result.changes;
  }
}
