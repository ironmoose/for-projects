import type { Database } from "bun:sqlite";
import type { DocumentSummary, ProjectSummary } from "../entities";

export class ProjectDocumentRepository {
  constructor(private db: Database) {}

  linkDocuments(projectId: string, documentIds: string[]): void {
    if (documentIds.length === 0) return;
    const stmt = this.db.query("INSERT OR IGNORE INTO project_documents (project_id, document_id) VALUES (?, ?)");
    for (const documentId of documentIds) {
      stmt.run(projectId, documentId);
    }
  }

  unlinkDocuments(projectId: string, documentIds: string[]): void {
    if (documentIds.length === 0) return;
    const placeholders = documentIds.map(() => "?").join(", ");
    this.db.query(`DELETE FROM project_documents WHERE project_id = ? AND document_id IN (${placeholders})`).run(projectId, ...documentIds);
  }

  getDocumentsForProject(projectId: string): DocumentSummary[] {
    return this.db
      .query(
        "SELECT d.id, d.title, (d.content IS NOT NULL) as has_content, d.created_at, d.updated_at FROM documents d JOIN project_documents pd ON pd.document_id = d.id WHERE pd.project_id = ? ORDER BY d.created_at DESC"
      )
      .all(projectId) as DocumentSummary[];
  }

  getProjectsForDocument(documentId: string): ProjectSummary[] {
    return this.db
      .query(
        "SELECT p.id, p.title, (p.goal IS NOT NULL) as has_goal, (p.requirements IS NOT NULL) as has_requirements, (p.design IS NOT NULL) as has_design, p.created_at, p.updated_at FROM projects p JOIN project_documents pd ON pd.project_id = p.id WHERE pd.document_id = ? ORDER BY p.created_at DESC"
      )
      .all(documentId) as ProjectSummary[];
  }
}
