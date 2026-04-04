import type { Database } from "bun:sqlite";
import type { DocumentReference, DocumentReferenceSummary, DocumentReferenceType, EntityType } from "../entities";

export class DocumentReferenceRepository {
  constructor(private db: Database) {}

  getReferencesForEntity(entityType: EntityType, entityId: string): DocumentReference[] {
    return this.db
      .query("SELECT * FROM document_references WHERE entity_type = ? AND entity_id = ?")
      .all(entityType, entityId) as DocumentReference[];
  }

  getReferencesForEntityWithDocumentTitles(entityType: EntityType, entityId: string): DocumentReferenceSummary[] {
    const rows = this.db
      .query(
        `SELECT dr.document_id, d.title AS document_title, dr.type
         FROM document_references dr
         JOIN documents d ON d.id = dr.document_id
         WHERE dr.entity_type = ? AND dr.entity_id = ?
         ORDER BY d.title, dr.type`
      )
      .all(entityType, entityId) as { document_id: string; document_title: string; type: DocumentReferenceType }[];

    // Group by document_id into summaries
    const map = new Map<string, DocumentReferenceSummary>();
    for (const row of rows) {
      const existing = map.get(row.document_id);
      if (existing) {
        existing.types.push(row.type);
      } else {
        map.set(row.document_id, {
          document_id: row.document_id,
          document_title: row.document_title,
          types: [row.type],
        });
      }
    }
    return [...map.values()];
  }

  getEntitiesForDocument(documentId: string): DocumentReference[] {
    return this.db
      .query("SELECT * FROM document_references WHERE document_id = ?")
      .all(documentId) as DocumentReference[];
  }

  setReferencesForEntityDocument(
    entityType: EntityType,
    entityId: string,
    documentId: string,
    types: DocumentReferenceType[],
  ): void {
    this.db
      .query("DELETE FROM document_references WHERE entity_type = ? AND entity_id = ? AND document_id = ?")
      .run(entityType, entityId, documentId);

    const now = new Date().toISOString();
    const stmt = this.db.query(
      "INSERT INTO document_references (entity_type, entity_id, document_id, type, created_at) VALUES (?, ?, ?, ?, ?)"
    );
    for (const type of types) {
      stmt.run(entityType, entityId, documentId, type, now);
    }
  }

  removeReferencesForEntityDocument(entityType: EntityType, entityId: string, documentId: string): void {
    this.db
      .query("DELETE FROM document_references WHERE entity_type = ? AND entity_id = ? AND document_id = ?")
      .run(entityType, entityId, documentId);
  }

  removeAllForEntity(entityType: EntityType, entityId: string): void {
    this.db
      .query("DELETE FROM document_references WHERE entity_type = ? AND entity_id = ?")
      .run(entityType, entityId);
  }

  removeAllForDocument(documentId: string): void {
    this.db
      .query("DELETE FROM document_references WHERE document_id = ?")
      .run(documentId);
  }

  findByEntityAndDocument(
    entityType: EntityType,
    entityId: string,
    documentId: string,
  ): DocumentReference[] {
    return this.db
      .query("SELECT * FROM document_references WHERE entity_type = ? AND entity_id = ? AND document_id = ?")
      .all(entityType, entityId, documentId) as DocumentReference[];
  }
}
