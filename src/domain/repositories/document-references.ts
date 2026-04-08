import type { Database } from "bun:sqlite";
import type { DocumentReference, DocumentReferenceSummary, DocumentReferenceDetail, DocumentReferenceType } from "../entities";

export class DocumentReferenceRepository {
  constructor(private db: Database) {}

  setReferencesForEntityDocument(
    entityType: string,
    entityId: string,
    documentId: string,
    types: DocumentReferenceType[],
  ): void {
    this.db
      .query(
        "DELETE FROM document_references WHERE entity_type = ? AND entity_id = ? AND document_id = ?",
      )
      .run(entityType, entityId, documentId);

    if (types.length === 0) return;

    const stmt = this.db.query(
      "INSERT INTO document_references (entity_type, entity_id, document_id, type) VALUES (?, ?, ?, ?)",
    );
    for (const type of types) {
      stmt.run(entityType, entityId, documentId, type);
    }
  }

  removeReferencesForEntityDocument(
    entityType: string,
    entityId: string,
    documentId: string,
  ): void {
    this.db
      .query(
        "DELETE FROM document_references WHERE entity_type = ? AND entity_id = ? AND document_id = ?",
      )
      .run(entityType, entityId, documentId);
  }

  removeAllForEntity(entityType: string, entityId: string): void {
    this.db
      .query("DELETE FROM document_references WHERE entity_type = ? AND entity_id = ?")
      .run(entityType, entityId);
  }

  removeAllForDocument(documentId: string): void {
    this.db
      .query("DELETE FROM document_references WHERE document_id = ?")
      .run(documentId);
  }

  getReferencesForEntity(entityType: string, entityId: string): DocumentReference[] {
    return this.db
      .query(
        "SELECT * FROM document_references WHERE entity_type = ? AND entity_id = ? ORDER BY type, document_id",
      )
      .all(entityType, entityId) as DocumentReference[];
  }

  getReferencesForEntityWithDocumentTitles(
    entityType: string,
    entityId: string,
  ): DocumentReferenceSummary[] {
    return this.db
      .query(
        `SELECT dr.document_id, d.title AS document_title, dr.type
         FROM document_references dr
         JOIN documents d ON d.id = dr.document_id
         WHERE dr.entity_type = ? AND dr.entity_id = ?
         ORDER BY dr.type, d.title`,
      )
      .all(entityType, entityId) as DocumentReferenceSummary[];
  }

  getReferencesForEntities(
    entityType: string,
    entityIds: string[],
  ): Map<string, DocumentReferenceSummary[]> {
    if (entityIds.length === 0) return new Map();

    const CHUNK_SIZE = 100;
    const result = new Map<string, DocumentReferenceSummary[]>();

    for (let i = 0; i < entityIds.length; i += CHUNK_SIZE) {
      const chunk = entityIds.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => "?").join(", ");
      const rows = this.db
        .query(
          `SELECT dr.entity_id, dr.document_id, d.title AS document_title, dr.type
           FROM document_references dr
           JOIN documents d ON d.id = dr.document_id
           WHERE dr.entity_type = ? AND dr.entity_id IN (${placeholders})
           ORDER BY dr.type, d.title`,
        )
        .all(entityType, ...chunk) as (DocumentReferenceSummary & { entity_id: string })[];

      for (const row of rows) {
        let refs = result.get(row.entity_id);
        if (!refs) {
          refs = [];
          result.set(row.entity_id, refs);
        }
        refs.push({
          document_id: row.document_id,
          document_title: row.document_title,
          type: row.type,
        });
      }
    }

    return result;
  }

  /** Single-query join returning enriched reference details (title, summary, favorite). */
  findByEntity(entityType: string, entityId: string): DocumentReferenceDetail[] {
    const rows = this.db
      .query(
        `SELECT dr.document_id, dr.type, d.title, d.summary, d.favorite
         FROM document_references dr
         JOIN documents d ON d.id = dr.document_id
         WHERE dr.entity_type = ? AND dr.entity_id = ?
         ORDER BY dr.type, d.title`,
      )
      .all(entityType, entityId) as { document_id: string; type: DocumentReferenceType; title: string; summary: string | null; favorite: number | boolean }[];
    return rows.map((row) => ({
      document_id: row.document_id,
      type: row.type,
      title: row.title,
      summary: row.summary,
      favorite: row.favorite === 1 || row.favorite === true,
    }));
  }

  /** Batch-fetch linked projects for multiple documents. Returns Map<document_id, {id, title}[]>. */
  getProjectsForDocuments(documentIds: string[]): Map<string, { id: string; title: string }[]> {
    if (documentIds.length === 0) return new Map();

    const CHUNK_SIZE = 100;
    const result = new Map<string, { id: string; title: string }[]>();

    for (let i = 0; i < documentIds.length; i += CHUNK_SIZE) {
      const chunk = documentIds.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => "?").join(", ");
      const rows = this.db
        .query(
          `SELECT DISTINCT dr.document_id, p.id AS project_id, p.title
           FROM document_references dr
           JOIN projects p ON dr.entity_id = p.id
           WHERE dr.entity_type = 'project'
             AND dr.document_id IN (${placeholders})
           ORDER BY p.title`,
        )
        .all(...chunk) as { document_id: string; project_id: string; title: string }[];

      for (const row of rows) {
        let list = result.get(row.document_id);
        if (!list) {
          list = [];
          result.set(row.document_id, list);
        }
        list.push({ id: row.project_id, title: row.title });
      }
    }

    return result;
  }

  getEntitiesForDocument(documentId: string): DocumentReference[] {
    return this.db
      .query(
        "SELECT * FROM document_references WHERE document_id = ? ORDER BY entity_type, entity_id",
      )
      .all(documentId) as DocumentReference[];
  }

  getEntitiesForDocumentWithTitles(documentId: string): { entity_type: string; entity_id: string; entity_title: string; type: string }[] {
    const rows = this.db
      .query(
        `SELECT dr.entity_type, dr.entity_id, dr.type,
                COALESCE(p.title, t.title, '') AS entity_title
         FROM document_references dr
         LEFT JOIN projects p ON dr.entity_type = 'project' AND dr.entity_id = p.id
         LEFT JOIN tasks t ON dr.entity_type = 'task' AND dr.entity_id = t.id
         WHERE dr.document_id = ?
         ORDER BY dr.entity_type, dr.entity_id`,
      )
      .all(documentId) as { entity_type: string; entity_id: string; type: string; entity_title: string }[];
    return rows;
  }
}
