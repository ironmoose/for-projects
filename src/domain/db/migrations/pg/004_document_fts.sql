-- GIN index for full-text search on documents (title + summary).
-- Used by hybrid semantic search to boost keyword matches alongside vector similarity.
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents
    USING gin (to_tsvector('english', title || ' ' || coalesce(summary, '')));
