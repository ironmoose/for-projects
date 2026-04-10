ALTER TABLE documents ADD COLUMN folder TEXT;
CREATE INDEX idx_documents_folder ON documents(folder);
