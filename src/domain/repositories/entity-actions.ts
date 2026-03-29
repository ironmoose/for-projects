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
