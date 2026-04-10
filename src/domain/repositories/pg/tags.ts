import type { Sql, TransactionSql } from "postgres";
import { ulid } from "ulid";
import type { Tag, EntityType, TagName } from "../../entities";

export class PgTagRepository {
  constructor(private sql: Sql) {}

  async findOrCreateByKind(kind: string): Promise<Tag> {
    const now = new Date().toISOString();
    const id = ulid();
    await this.sql`INSERT INTO tags (id, kind, created_at) VALUES (${id}, ${kind}, ${now}) ON CONFLICT (kind) DO NOTHING`;
    const rows = await this.sql<Tag[]>`SELECT * FROM tags WHERE kind = ${kind}`;
    return rows[0];
  }

  async findByKinds(kinds: string[]): Promise<Tag[]> {
    if (kinds.length === 0) return [];
    return this.sql<Tag[]>`SELECT * FROM tags WHERE kind IN ${this.sql(kinds)}`;
  }

  async setTagsForEntity(entityType: EntityType, entityId: string, tagKinds: string[]): Promise<void> {
    await this.sql.begin(async (tx) => {
      const tags: Tag[] = [];
      for (const kind of tagKinds) {
        tags.push(await this.findOrCreateByKindTx(tx, kind));
      }
      await tx`DELETE FROM entity_tags WHERE entity_type = ${entityType} AND entity_id = ${entityId}`;
      for (const tag of tags) {
        await tx`INSERT INTO entity_tags (entity_type, entity_id, tag_id) VALUES (${entityType}, ${entityId}, ${tag.id})`;
      }
    });
  }

  async getTagsForEntities(entityType: EntityType, entityIds: string[]): Promise<Map<string, TagName[]>> {
    if (entityIds.length === 0) return new Map();

    const result = new Map<string, TagName[]>();
    const CHUNK_SIZE = 100;

    for (let i = 0; i < entityIds.length; i += CHUNK_SIZE) {
      const chunk = entityIds.slice(i, i + CHUNK_SIZE);
      const rows = await this.sql<{ entity_id: string; kind: TagName }[]>`
        SELECT et.entity_id, t.kind FROM entity_tags et
        JOIN tags t ON t.id = et.tag_id
        WHERE et.entity_type = ${entityType} AND et.entity_id IN ${this.sql(chunk)}
        ORDER BY t.kind
      `;
      for (const row of rows) {
        let tags = result.get(row.entity_id);
        if (!tags) { tags = []; result.set(row.entity_id, tags); }
        tags.push(row.kind);
      }
    }
    return result;
  }

  async getTagsForEntity(entityType: EntityType, entityId: string): Promise<Tag[]> {
    return this.sql<Tag[]>`
      SELECT t.* FROM tags t
      JOIN entity_tags et ON et.tag_id = t.id
      WHERE et.entity_type = ${entityType} AND et.entity_id = ${entityId}
      ORDER BY t.kind
    `;
  }

  async findEntitiesByTag(tagKind: string, entityType?: EntityType): Promise<{ entity_type: string; entity_id: string }[]> {
    if (entityType) {
      return this.sql<{ entity_type: string; entity_id: string }[]>`
        SELECT et.entity_type, et.entity_id FROM entity_tags et
        JOIN tags t ON t.id = et.tag_id
        WHERE t.kind = ${tagKind} AND et.entity_type = ${entityType}
      `;
    }
    return this.sql<{ entity_type: string; entity_id: string }[]>`
      SELECT et.entity_type, et.entity_id FROM entity_tags et
      JOIN tags t ON t.id = et.tag_id
      WHERE t.kind = ${tagKind}
    `;
  }

  async removeTagsForEntity(entityType: EntityType, entityId: string): Promise<void> {
    await this.sql`DELETE FROM entity_tags WHERE entity_type = ${entityType} AND entity_id = ${entityId}`;
  }

  private async findOrCreateByKindTx(tx: TransactionSql, kind: string): Promise<Tag> {
    const now = new Date().toISOString();
    const id = ulid();
    await tx`INSERT INTO tags (id, kind, created_at) VALUES (${id}, ${kind}, ${now}) ON CONFLICT (kind) DO NOTHING`;
    const rows = await tx`SELECT * FROM tags WHERE kind = ${kind}`;
    return rows[0] as Tag;
  }
}
