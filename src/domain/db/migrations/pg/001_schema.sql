-- tab-for-projects: Postgres schema (pgvector)
-- Mirrors the final SQLite schema after all migrations (001–027),
-- with proper Postgres types and vector(768) embedding columns.
--
-- Requires: CREATE EXTENSION IF NOT EXISTS vector;  (handled by init.sql)

-- ============================================================
-- Core tables
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    summary      TEXT,
    context      TEXT,
    requirements TEXT,
    embedding    vector(768),
    created_at   TIMESTAMPTZ NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id                  TEXT PRIMARY KEY,
    project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    summary             TEXT,
    context             TEXT,
    acceptance_criteria TEXT,
    group_key           TEXT,
    status              TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done', 'archived')),
    effort              TEXT CHECK (effort IN ('trivial', 'low', 'medium', 'high', 'extreme')),
    impact              TEXT CHECK (impact IN ('trivial', 'low', 'medium', 'high', 'extreme')),
    category            TEXT CHECK (category IN ('feature', 'bugfix', 'refactor', 'test', 'perf', 'infra', 'docs', 'security', 'design', 'chore')),
    is_blocked          BOOLEAN NOT NULL DEFAULT false,
    embedding           vector(768),
    created_at          TIMESTAMPTZ NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_effort ON tasks(effort);
CREATE INDEX IF NOT EXISTS idx_tasks_impact ON tasks(impact);
CREATE INDEX IF NOT EXISTS idx_tasks_group_key ON tasks(project_id, group_key);

-- ============================================================
-- Knowledge base
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
    id                TEXT PRIMARY KEY,
    title             TEXT NOT NULL,
    summary           TEXT,
    content           TEXT,
    folder            TEXT,
    favorite          BOOLEAN NOT NULL DEFAULT false,
    source_url        TEXT,
    source_type       TEXT,
    source_fetched_at TIMESTAMPTZ,
    embedding         vector(768),
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder);

-- HNSW index for cosine similarity search on document embeddings
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_projects_embedding ON projects
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_embedding ON tasks
    USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- Tags (polymorphic)
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
    id         TEXT PRIMARY KEY,
    kind       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_kind ON tags(kind);

CREATE TABLE IF NOT EXISTS entity_tags (
    entity_type TEXT NOT NULL,
    entity_id   TEXT NOT NULL,
    tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entity_type, entity_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag_id ON entity_tags(tag_id);

-- ============================================================
-- Document references (polymorphic)
-- ============================================================

CREATE TABLE IF NOT EXISTS document_references (
    entity_type  TEXT NOT NULL,
    entity_id    TEXT NOT NULL,
    document_id  TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    type         TEXT NOT NULL CHECK (type IN ('goal', 'plan', 'requirements', 'design', 'reference', 'note')),
    PRIMARY KEY (entity_type, entity_id, document_id, type)
);
CREATE INDEX IF NOT EXISTS idx_document_references_entity ON document_references(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_document_references_document ON document_references(document_id);
CREATE INDEX IF NOT EXISTS idx_document_references_type ON document_references(type);

-- ============================================================
-- Task dependencies
-- ============================================================

CREATE TABLE IF NOT EXISTS task_dependencies (
    source_task_id  TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    target_task_id  TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL CHECK (dependency_type IN ('blocks', 'relates_to')),
    created_at      TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (source_task_id, target_task_id),
    CHECK (source_task_id != target_task_id)
);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_target ON task_dependencies(target_task_id);

-- ============================================================
-- Activity log
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id          TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id   TEXT,
    action      TEXT NOT NULL,
    summary     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
