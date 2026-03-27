-- Drop the slug column from projects.
-- SQLite cannot drop a UNIQUE column directly, so we rebuild the table.

CREATE TABLE projects_new (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO projects_new (id, name, description, status, created_at, updated_at)
SELECT id, name, description, status, created_at, updated_at FROM projects;

DROP TABLE projects;

ALTER TABLE projects_new RENAME TO projects;
