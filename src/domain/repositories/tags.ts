import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Tag, EntityType } from "../entities";

export class TagRepository {
  constructor(private db: Database) {}

  findOrCreateByKind(kind: string): Tag {
    const now = new Date().toISOString();
    const id = ulid();
    this.db.query("INSERT OR IGNORE INTO tags (id, kind, created_at) VALUES (?, ?, ?)").run(id, kind, now);
    return this.db.query("SELECT * FROM tags WHERE kind = ?").get(kind) as Tag;
  }

  findByKinds(kinds: string[]): Tag[] {
    if (kinds.length === 0) return [];
    const placeholders = kinds.map(() => "?").join(", ");
    return this.db.query(`SELECT * FROM tags WHERE kind IN (${placeholders})`).all(...kinds) as Tag[];
  }

  setTagsForEntity(entityType: EntityType, entityId: string, tagKinds: string[]): void {
    this.db.exec("BEGIN TRANSACTION");
    try {
      const tags = tagKinds.map((kind) => this.findOrCreateByKind(kind));
      this.db.query("DELETE FROM entity_tags WHERE entity_type = ? AND entity_id = ?").run(entityType, entityId);

      const stmt = this.db.query("INSERT INTO entity_tags (entity_type, entity_id, tag_id) VALUES (?, ?, ?)");
      for (const tag of tags) {
        stmt.run(entityType, entityId, tag.id);
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }

  getTagsForEntity(entityType: EntityType, entityId: string): Tag[] {
    return this.db
      .query("SELECT t.* FROM tags t JOIN entity_tags et ON et.tag_id = t.id WHERE et.entity_type = ? AND et.entity_id = ? ORDER BY t.kind")
      .all(entityType, entityId) as Tag[];
  }

  findEntitiesByTag(tagKind: string, entityType?: EntityType): { entity_type: string; entity_id: string }[] {
    const conditions: string[] = ["t.kind = ?"];
    const params: string[] = [tagKind];

    if (entityType) {
      conditions.push("et.entity_type = ?");
      params.push(entityType);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    return this.db
      .query(`SELECT et.entity_type, et.entity_id FROM entity_tags et JOIN tags t ON t.id = et.tag_id ${where}`)
      .all(...params) as { entity_type: string; entity_id: string }[];
  }

  removeTagsForEntity(entityType: EntityType, entityId: string): void {
    this.db.query("DELETE FROM entity_tags WHERE entity_type = ? AND entity_id = ?").run(entityType, entityId);
  }
}
