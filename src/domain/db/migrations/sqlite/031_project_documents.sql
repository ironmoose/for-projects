-- Rename document_references → project_documents and drop the reference-type
-- and polymorphic entity_type/entity_id columns. The table was polymorphic in
-- theory but migration 025 already stripped every task reference, so only
-- entity_type='project' rows remained in practice. Collapse those into a
-- simple project ↔ document many-to-many.
--
-- A single doc that was previously linked to a project under multiple types
-- (e.g. both 'design' and 'reference') becomes a single link — DISTINCT
-- collapses the duplicates.

CREATE TABLE project_documents (
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, document_id)
);
CREATE INDEX idx_project_documents_project ON project_documents(project_id);
CREATE INDEX idx_project_documents_document ON project_documents(document_id);

INSERT INTO project_documents (project_id, document_id)
SELECT DISTINCT entity_id, document_id
FROM document_references
WHERE entity_type = 'project';

DROP INDEX IF EXISTS idx_document_references_entity;
DROP INDEX IF EXISTS idx_document_references_document;
DROP INDEX IF EXISTS idx_document_references_type;
DROP TABLE document_references;
