import type { Database } from "bun:sqlite";

export function runMigrations(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      slug        TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paused', 'completed', 'archived')),
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug)");

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      number      INTEGER NOT NULL,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'todo'
                  CHECK (status IN ('todo', 'in_progress', 'done')),
      priority    INTEGER CHECK (priority BETWEEN 1 AND 10),
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE(project_id, number)
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_tasks_project_number ON tasks(project_id, number)");

  // ── Tags ──────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id)");
}
