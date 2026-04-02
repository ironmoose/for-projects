import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Tag, EntityType } from "../entities";

export class TagRepository {
  constructor(private db: Database) {}

  findOrCreateByName(name: string): Tag {
    const now = new Date().toISOString();
    const id = ulid();
    this.db.query("INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)").run(id, name, now);
    return this.db.query("SELECT * FROM tags WHERE name = ?").get(name) as Tag;
  }

  findByNames(names: string[]): Tag[] {
    if (names.length === 0) return [];
    const placeholders = names.map(() => "?").join(", ");
    return this.db.query(`SELECT * FROM tags WHERE name IN (${placeholders})`).all(...names) as Tag[];
  }

  setTagsForEntity(entityType: EntityType, entityId: string, tagNames: string[]): void {
    this.db.exec("BEGIN TRANSACTION");
    try {
      const tags = tagNames.map((name) => this.findOrCreateByName(name));
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
      .query("SELECT t.* FROM tags t JOIN entity_tags et ON et.tag_id = t.id WHERE et.entity_type = ? AND et.entity_id = ? ORDER BY t.name")
      .all(entityType, entityId) as Tag[];
  }

  findEntitiesByTag(tagName: string, entityType?: EntityType): { entity_type: string; entity_id: string }[] {
    const conditions: string[] = ["t.name = ?"];
    const params: string[] = [tagName];

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
