import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { DocumentReferenceType } from "../../../entities";
import { shouldMigrate, generateDocumentTitle, FIELD_TO_REFERENCE_TYPE } from "../../migration-utils";

/**
 * Migration 021: Migrate project text blobs (goal, requirements, design)
 * into standalone documents linked via document_references.
 *
 * Prerequisites: migrations 018 (summary columns), 019 (document_references
 * table), 020 (project_documents migrated/dropped).
 *
 * For each project with non-null text blob fields, this migration:
 * 1. Creates a document for each field (goal, requirements, design)
 * 2. Links it via document_references with the appropriate type
 * 3. Populates the project summary from goal (truncated to 1000 chars)
 */

interface ProjectRow {
  id: string;
  title: string;
  goal: string | null;
  requirements: string | null;
  design: string | null;
}

export function up(db: Database): void {
  const projects = db
    .query(
      `SELECT id, title, goal, requirements, design FROM projects
       WHERE goal IS NOT NULL OR requirements IS NOT NULL OR design IS NOT NULL`
    )
    .all() as ProjectRow[];

  if (projects.length === 0) return;

  const insertDoc = db.prepare(
    `INSERT INTO documents (id, title, summary, content, favorite, created_at, updated_at)
     VALUES (?, ?, NULL, ?, 0, ?, ?)`
  );

  const insertRef = db.prepare(
    `INSERT INTO document_references (entity_type, entity_id, document_id, type)
     VALUES ('project', ?, ?, ?)`
  );

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z");
  const fields = ["goal", "requirements", "design"] as const;

  for (const project of projects) {
    for (const field of fields) {
      const value = project[field];
      if (!shouldMigrate(value)) continue;

      const docId = ulid();
      const refType = FIELD_TO_REFERENCE_TYPE[field];
      const title = generateDocumentTitle(project.title, refType as DocumentReferenceType);

      insertDoc.run(docId, title, value, now, now);
      insertRef.run(project.id, docId, refType);
    }
  }

  db.run(
    `UPDATE projects SET summary = SUBSTR(goal, 1, 1000) WHERE goal IS NOT NULL`
  );
}
