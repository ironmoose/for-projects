import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { DocumentReferenceType } from "../../migration-utils";
import { shouldMigrate, generateDocumentTitle, FIELD_TO_REFERENCE_TYPE } from "../../migration-utils";

/**
 * Migration 022: Migrate task text blobs (plan, description, implementation,
 * acceptance_criteria) into standalone documents linked via document_references.
 *
 * Prerequisites: migrations 018 (summary columns), 019 (document_references
 * table).
 *
 * For each task with non-null text blob fields, this migration:
 * 1. Creates a document for each non-empty field
 * 2. Links it via document_references with the appropriate type
 * 3. Populates the task summary from COALESCE(description, plan), truncated to 1000 chars
 */

interface TaskRow {
  id: string;
  title: string;
  plan: string | null;
  description: string | null;
  implementation: string | null;
  acceptance_criteria: string | null;
}

export function up(db: Database): void {
  const tasks = db
    .query(
      `SELECT id, title, plan, description, implementation, acceptance_criteria
       FROM tasks
       WHERE plan IS NOT NULL OR description IS NOT NULL
         OR implementation IS NOT NULL OR acceptance_criteria IS NOT NULL`
    )
    .all() as TaskRow[];

  if (tasks.length === 0) return;

  const insertDoc = db.prepare(
    `INSERT INTO documents (id, title, summary, content, favorite, created_at, updated_at)
     VALUES (?, ?, NULL, ?, 0, ?, ?)`
  );

  const insertRef = db.prepare(
    `INSERT INTO document_references (entity_type, entity_id, document_id, type)
     VALUES ('task', ?, ?, ?)`
  );

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z");
  const fields = ["plan", "description", "implementation", "acceptance_criteria"] as const;

  for (const task of tasks) {
    for (const field of fields) {
      const value = task[field];
      if (!shouldMigrate(value)) continue;

      const docId = ulid();
      const refType = FIELD_TO_REFERENCE_TYPE[field];
      const title = generateDocumentTitle(task.title, refType as DocumentReferenceType);

      insertDoc.run(docId, title, value, now, now);
      insertRef.run(task.id, docId, refType);
    }
  }

  db.run(
    `UPDATE tasks SET summary = SUBSTR(COALESCE(description, plan), 1, 1000)
     WHERE description IS NOT NULL OR plan IS NOT NULL`
  );
}
