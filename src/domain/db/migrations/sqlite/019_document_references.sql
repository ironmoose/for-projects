CREATE TABLE document_references (
    entity_type  TEXT NOT NULL,
    entity_id    TEXT NOT NULL,
    document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    type         TEXT NOT NULL,
    PRIMARY KEY (entity_type, entity_id, document_id, type)
);
CREATE INDEX idx_document_references_entity ON document_references(entity_type, entity_id);
CREATE INDEX idx_document_references_document ON document_references(document_id);
CREATE INDEX idx_document_references_type ON document_references(type);
