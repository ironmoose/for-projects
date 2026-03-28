import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Template } from "../entities";
import type { CreateTemplateInput, UpdateTemplateInput } from "../inputs";

export class TemplateRepository {
  constructor(private db: Database) {}

  findAll(limit?: number, offset?: number): Template[] {
    if (limit !== undefined && offset !== undefined) {
      return this.db
        .query("SELECT * FROM templates ORDER BY name ASC LIMIT ? OFFSET ?")
        .all(limit, offset) as Template[];
    }
    return this.db
      .query("SELECT * FROM templates ORDER BY name ASC")
      .all() as Template[];
  }

  count(): number {
    return (this.db.query("SELECT COUNT(*) as total FROM templates").get() as { total: number }).total;
  }

  findById(id: string): Template | null {
    return this.db.query("SELECT * FROM templates WHERE id = ?").get(id) as Template | null;
  }

  create(input: CreateTemplateInput): Template {
    const id = ulid();
    const now = new Date().toISOString();

    this.db
      .query(
        `INSERT INTO templates (id, name, description, prompt, agent, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.name,
        input.description ?? "",
        input.prompt,
        input.agent ?? null,
        now,
        now
      );

    return this.findById(id)!;
  }

  update(id: string, input: UpdateTemplateInput): Template | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const name = input.name ?? existing.name;
    const description = input.description ?? existing.description;
    const prompt = input.prompt ?? existing.prompt;
    const agent = input.agent !== undefined ? input.agent : existing.agent;
    const now = new Date().toISOString();

    this.db
      .query(
        `UPDATE templates SET name = ?, description = ?, prompt = ?, agent = ?, updated_at = ? WHERE id = ?`
      )
      .run(name, description, prompt, agent, now, id);

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.query("DELETE FROM templates WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
