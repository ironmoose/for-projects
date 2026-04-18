import type { Database } from "bun:sqlite";
import type { ProjectDocument, ProjectDocumentDetail } from "../../entities";

export class ProjectDocumentRepository {
  constructor(private db: Database) {}

  async linkDocuments(projectId: string, documentIds: string[]): Promise<void> {
    if (documentIds.length === 0) return;
    // INSERT OR IGNORE — idempotent on the composite PK.
    const stmt = this.db.query(
      "INSERT OR IGNORE INTO project_documents (project_id, document_id) VALUES (?, ?)",
    );
    for (const documentId of documentIds) {
      stmt.run(projectId, documentId);
    }
  }

  async unlinkDocument(projectId: string, documentId: string): Promise<void> {
    this.db
      .query("DELETE FROM project_documents WHERE project_id = ? AND document_id = ?")
      .run(projectId, documentId);
  }

  async removeAllForProject(projectId: string): Promise<void> {
    this.db
      .query("DELETE FROM project_documents WHERE project_id = ?")
      .run(projectId);
  }

  async removeAllForDocument(documentId: string): Promise<void> {
    this.db
      .query("DELETE FROM project_documents WHERE document_id = ?")
      .run(documentId);
  }

  async findByProject(projectId: string): Promise<ProjectDocument[]> {
    return this.db
      .query(
        "SELECT project_id, document_id FROM project_documents WHERE project_id = ? ORDER BY document_id",
      )
      .all(projectId) as ProjectDocument[];
  }

  async findDetailsForProject(projectId: string): Promise<ProjectDocumentDetail[]> {
    const rows = this.db
      .query(
        `SELECT pd.document_id, d.title, d.summary, d.favorite
         FROM project_documents pd
         JOIN documents d ON d.id = pd.document_id
         WHERE pd.project_id = ?
         ORDER BY d.title`,
      )
      .all(projectId) as {
        document_id: string;
        title: string;
        summary: string | null;
        favorite: number | boolean;
      }[];
    return rows.map((row) => ({
      document_id: row.document_id,
      title: row.title,
      summary: row.summary,
      favorite: row.favorite === 1 || row.favorite === true,
    }));
  }

  async findDetailsForProjects(
    projectIds: string[],
  ): Promise<Map<string, ProjectDocumentDetail[]>> {
    const result = new Map<string, ProjectDocumentDetail[]>();
    if (projectIds.length === 0) return result;

    const CHUNK_SIZE = 100;
    for (let i = 0; i < projectIds.length; i += CHUNK_SIZE) {
      const chunk = projectIds.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => "?").join(", ");
      const rows = this.db
        .query(
          `SELECT pd.project_id, pd.document_id, d.title, d.summary, d.favorite
           FROM project_documents pd
           JOIN documents d ON d.id = pd.document_id
           WHERE pd.project_id IN (${placeholders})
           ORDER BY d.title`,
        )
        .all(...chunk) as {
          project_id: string;
          document_id: string;
          title: string;
          summary: string | null;
          favorite: number | boolean;
        }[];
      for (const row of rows) {
        let list = result.get(row.project_id);
        if (!list) {
          list = [];
          result.set(row.project_id, list);
        }
        list.push({
          document_id: row.document_id,
          title: row.title,
          summary: row.summary,
          favorite: row.favorite === 1 || row.favorite === true,
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
      const placeholders = chunk.map(() => "?").join(", ");
      const rows = this.db
        .query(
          `SELECT pd.document_id, p.id AS project_id, p.title
           FROM project_documents pd
           JOIN projects p ON pd.project_id = p.id
           WHERE pd.document_id IN (${placeholders})
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
}
