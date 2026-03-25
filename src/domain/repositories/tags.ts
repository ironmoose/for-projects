import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Tag, Task } from "../entities";

export class TagRepository {
  constructor(private db: Database) {}

  findAll(limit: number, offset: number): Tag[] {
    return this.db
      .query("SELECT * FROM tags ORDER BY name ASC LIMIT ? OFFSET ?")
      .all(limit, offset) as Tag[];
  }

  count(): number {
    return (this.db.query("SELECT COUNT(*) as total FROM tags").get() as { total: number }).total;
  }

  findById(id: string): Tag | null {
    return this.db.query("SELECT * FROM tags WHERE id = ?").get(id) as Tag | null;
  }

  findByName(name: string): Tag | null {
    return this.db.query("SELECT * FROM tags WHERE name = ?").get(name) as Tag | null;
  }

  create(name: string): Tag {
    const id = ulid();
    this.db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(id, name);
    return this.db.query("SELECT * FROM tags WHERE id = ?").get(id) as Tag;
  }

  delete(id: string): boolean {
    const result = this.db.query("DELETE FROM tags WHERE id = ?").run(id);
    return result.changes > 0;
  }

  addTagToTask(taskId: string, tagId: string): void {
    this.db
      .query("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)")
      .run(taskId, tagId);
  }

  removeTagFromTask(taskId: string, tagId: string): boolean {
    const result = this.db
      .query("DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?")
      .run(taskId, tagId);
    return result.changes > 0;
  }

  getTagsForTask(taskId: string): Tag[] {
    return this.db
      .query(
        `SELECT t.* FROM tags t
         JOIN task_tags tt ON tt.tag_id = t.id
         WHERE tt.task_id = ?
         ORDER BY t.name ASC`
      )
      .all(taskId) as Tag[];
  }

  findTasksByTag(tagId: string, limit: number, offset: number): Task[] {
    return this.db
      .query(
        `SELECT t.* FROM tasks t
         JOIN task_tags tt ON tt.task_id = t.id
         WHERE tt.tag_id = ?
         ORDER BY t.created_at ASC LIMIT ? OFFSET ?`
      )
      .all(tagId, limit, offset) as Task[];
  }

  countTasksByTag(tagId: string): number {
    return (this.db.query(
      "SELECT COUNT(*) as total FROM task_tags WHERE tag_id = ?"
    ).get(tagId) as { total: number }).total;
  }
}
