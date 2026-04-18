-- Mirror of SQLite migration 031. Rename document_references → project_documents
-- and drop the reference-type and polymorphic entity_type/entity_id columns.
--
-- Fresh installs run `pg/001_schema.sql` which already creates project_documents
-- and never creates document_references; the guarded DO block below is a no-op
-- in that case. Upgrades from a previous schema collapse the remaining project
-- links and drop the old table.

CREATE TABLE IF NOT EXISTS project_documents (
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_document ON project_documents(document_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'document_references'
    ) THEN
        INSERT INTO project_documents (project_id, document_id)
        SELECT DISTINCT entity_id, document_id
        FROM document_references
        WHERE entity_type = 'project'
        ON CONFLICT (project_id, document_id) DO NOTHING;

        DROP INDEX IF EXISTS idx_document_references_entity;
        DROP INDEX IF EXISTS idx_document_references_document;
        DROP INDEX IF EXISTS idx_document_references_type;
        DROP TABLE document_references;
    END IF;
END $$;
