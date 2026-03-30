-- Migration 004: Add sessions entity + link runs to sessions
-- Sessions represent conversational sessions bound to a project.

CREATE TABLE sessions (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    summary    TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT
);

CREATE INDEX idx_sessions_project_id ON sessions(project_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);

-- Add optional session_id to runs so they can be grouped by session.
ALTER TABLE runs ADD COLUMN session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_runs_session_id ON runs(session_id);
