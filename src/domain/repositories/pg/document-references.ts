import type { Sql } from "postgres";
import type { DocumentReference, DocumentReferenceSummary, DocumentReferenceDetail, DocumentReferenceType } from "../../entities";

export class PgDocumentReferenceRepository {
  constructor(private sql: Sql) {}

  async setReferencesForEntityDocument(
    entityType: string, entityId: string, documentId: string, types: DocumentReferenceType[],
  ): Promise<void> {
    await this.sql`
      DELETE FROM document_references
      WHERE entity_type = ${entityType} AND entity_id = ${entityId} AND document_id = ${documentId}
    `;
    if (types.length === 0) return;
    for (const type of types) {
      await this.sql`
        INSERT INTO document_references (entity_type, entity_id, document_id, type)
        VALUES (${entityType}, ${entityId}, ${documentId}, ${type})
      `;
    }
  }

  async removeReferencesForEntityDocument(entityType: string, entityId: string, documentId: string): Promise<void> {
    await this.sql`
      DELETE FROM document_references
      WHERE entity_type = ${entityType} AND entity_id = ${entityId} AND document_id = ${documentId}
    `;
  }

  async removeAllForEntity(entityType: string, entityId: string): Promise<void> {
    await this.sql`DELETE FROM document_references WHERE entity_type = ${entityType} AND entity_id = ${entityId}`;
  }

  async removeAllForDocument(documentId: string): Promise<void> {
    await this.sql`DELETE FROM document_references WHERE document_id = ${documentId}`;
  }

  async getReferencesForEntity(entityType: string, entityId: string): Promise<DocumentReference[]> {
    return this.sql<DocumentReference[]>`
      SELECT * FROM document_references
      WHERE entity_type = ${entityType} AND entity_id = ${entityId}
      ORDER BY type, document_id
    `;
  }

  async getReferencesForEntityWithDocumentTitles(entityType: string, entityId: string): Promise<DocumentReferenceSummary[]> {
    return this.sql<DocumentReferenceSummary[]>`
      SELECT dr.document_id, d.title AS document_title, dr.type
      FROM document_references dr
      JOIN documents d ON d.id = dr.document_id
      WHERE dr.entity_type = ${entityType} AND dr.entity_id = ${entityId}
      ORDER BY dr.type, d.title
    `;
  }

  async getReferencesForEntities(entityType: string, entityIds: string[]): Promise<Map<string, DocumentReferenceSummary[]>> {
    if (entityIds.length === 0) return new Map();

    const result = new Map<string, DocumentReferenceSummary[]>();
    const CHUNK_SIZE = 100;

    for (let i = 0; i < entityIds.length; i += CHUNK_SIZE) {
      const chunk = entityIds.slice(i, i + CHUNK_SIZE);
      const rows = await this.sql<(DocumentReferenceSummary & { entity_id: string })[]>`
        SELECT dr.entity_id, dr.document_id, d.title AS document_title, dr.type
        FROM document_references dr
        JOIN documents d ON d.id = dr.document_id
        WHERE dr.entity_type = ${entityType} AND dr.entity_id IN ${this.sql(chunk)}
        ORDER BY dr.type, d.title
      `;
      for (const row of rows) {
        let refs = result.get(row.entity_id);
        if (!refs) { refs = []; result.set(row.entity_id, refs); }
        refs.push({ document_id: row.document_id, document_title: row.document_title, type: row.type });
      }
    }
    return result;
  }

  async findByEntity(entityType: string, entityId: string): Promise<DocumentReferenceDetail[]> {
    return this.sql<DocumentReferenceDetail[]>`
      SELECT dr.document_id, dr.type, d.title, d.summary, d.favorite
      FROM document_references dr
      JOIN documents d ON d.id = dr.document_id
      WHERE dr.entity_type = ${entityType} AND dr.entity_id = ${entityId}
      ORDER BY dr.type, d.title
    `;
  }

  async getProjectsForDocuments(documentIds: string[]): Promise<Map<string, { id: string; title: string }[]>> {
    if (documentIds.length === 0) return new Map();

    const result = new Map<string, { id: string; title: string }[]>();
    const CHUNK_SIZE = 100;

    for (let i = 0; i < documentIds.length; i += CHUNK_SIZE) {
      const chunk = documentIds.slice(i, i + CHUNK_SIZE);
      const rows = await this.sql<{ document_id: string; project_id: string; title: string }[]>`
        SELECT DISTINCT dr.document_id, p.id AS project_id, p.title
        FROM document_references dr
        JOIN projects p ON dr.entity_id = p.id
        WHERE dr.entity_type = 'project' AND dr.document_id IN ${this.sql(chunk)}
        ORDER BY p.title
      `;
      for (const row of rows) {
        let list = result.get(row.document_id);
        if (!list) { list = []; result.set(row.document_id, list); }
        list.push({ id: row.project_id, title: row.title });
      }
    }
    return result;
  }

  async getEntitiesForDocument(documentId: string): Promise<DocumentReference[]> {
    return this.sql<DocumentReference[]>`
      SELECT * FROM document_references WHERE document_id = ${documentId}
      ORDER BY entity_type, entity_id
    `;
  }

  async getEntitiesForDocumentWithTitles(documentId: string): Promise<{ entity_type: string; entity_id: string; entity_title: string; type: string }[]> {
    return this.sql<{ entity_type: string; entity_id: string; entity_title: string; type: string }[]>`
      SELECT dr.entity_type, dr.entity_id, dr.type,
        COALESCE(p.title, t.title, '') AS entity_title
      FROM document_references dr
      LEFT JOIN projects p ON dr.entity_type = 'project' AND dr.entity_id = p.id
      LEFT JOIN tasks t ON dr.entity_type = 'task' AND dr.entity_id = t.id
      WHERE dr.document_id = ${documentId}
      ORDER BY dr.entity_type, dr.entity_id
    `;
  }
}
