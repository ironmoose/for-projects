CREATE TABLE documents (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    content    TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE tags (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_tags_name ON tags(name);

CREATE TABLE entity_tags (
    entity_type TEXT NOT NULL,
    entity_id   TEXT NOT NULL,
    tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entity_type, entity_id, tag_id)
);
CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX idx_entity_tags_tag_id ON entity_tags(tag_id);

CREATE TABLE project_documents (
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, document_id)
);
CREATE INDEX idx_project_documents_document_id ON project_documents(document_id);
