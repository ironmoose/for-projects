import type { Sql } from "postgres";
import type { ProjectDocument, ProjectDocumentDetail } from "../../entities";

export class PgProjectDocumentRepository {
  constructor(private sql: Sql) {}

  async linkDocuments(projectId: string, documentIds: string[]): Promise<void> {
    if (documentIds.length === 0) return;
    for (const documentId of documentIds) {
      await this.sql`
        INSERT INTO project_documents (project_id, document_id)
        VALUES (${projectId}, ${documentId})
        ON CONFLICT (project_id, document_id) DO NOTHING
      `;
    }
  }

  async unlinkDocument(projectId: string, documentId: string): Promise<void> {
    await this.sql`
      DELETE FROM project_documents
      WHERE project_id = ${projectId} AND document_id = ${documentId}
    `;
  }

  async removeAllForProject(projectId: string): Promise<void> {
    await this.sql`DELETE FROM project_documents WHERE project_id = ${projectId}`;
  }

  async removeAllForDocument(documentId: string): Promise<void> {
    await this.sql`DELETE FROM project_documents WHERE document_id = ${documentId}`;
  }

  async findByProject(projectId: string): Promise<ProjectDocument[]> {
    return this.sql<ProjectDocument[]>`
      SELECT project_id, document_id FROM project_documents
      WHERE project_id = ${projectId}
      ORDER BY document_id
    `;
  }

  async findDetailsForProject(projectId: string): Promise<ProjectDocumentDetail[]> {
    return this.sql<ProjectDocumentDetail[]>`
      SELECT pd.document_id, d.title, d.summary, d.favorite
      FROM project_documents pd
      JOIN documents d ON d.id = pd.document_id
      WHERE pd.project_id = ${projectId}
      ORDER BY d.title
    `;
  }

  async findDetailsForProjects(
    projectIds: string[],
  ): Promise<Map<string, ProjectDocumentDetail[]>> {
    const result = new Map<string, ProjectDocumentDetail[]>();
    if (projectIds.length === 0) return result;

    const CHUNK_SIZE = 100;
    for (let i = 0; i < projectIds.length; i += CHUNK_SIZE) {
      const chunk = projectIds.slice(i, i + CHUNK_SIZE);
      const rows = await this.sql<(ProjectDocumentDetail & { project_id: string })[]>`
        SELECT pd.project_id, pd.document_id, d.title, d.summary, d.favorite
        FROM project_documents pd
        JOIN documents d ON d.id = pd.document_id
        WHERE pd.project_id IN ${this.sql(chunk)}
        ORDER BY d.title
      `;
      for (const row of rows) {
        let list = result.get(row.project_id);
        if (!list) { list = []; result.set(row.project_id, list); }
        list.push({
          document_id: row.document_id,
          title: row.title,
          summary: row.summary,
          favorite: row.favorite,
        });
      }
    }
    return result;
  }

  async getProjectsForDocuments(
    documentIds: string[],
  ): Promise<Map<string, { id: string; title: string }[]>> {
    const result = new Map<string, { id: string; title: string }[]>();
    if (documentIds.length === 0) return result;

    const CHUNK_SIZE = 100;
    for (let i = 0; i < documentIds.length; i += CHUNK_SIZE) {
      const chunk = documentIds.slice(i, i + CHUNK_SIZE);
      const rows = await this.sql<{ document_id: string; project_id: string; title: string }[]>`
        SELECT pd.document_id, p.id AS project_id, p.title
        FROM project_documents pd
        JOIN projects p ON pd.project_id = p.id
        WHERE pd.document_id IN ${this.sql(chunk)}
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
}
