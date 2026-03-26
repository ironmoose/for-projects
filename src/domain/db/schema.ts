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
      type        TEXT CHECK (type IN ('research', 'implementation', 'review', 'design', 'planning', 'testing', 'documentation')),
      effort      TEXT CHECK (effort IN ('trivial', 'low', 'moderate', 'high', 'extreme')),
      priority    INTEGER CHECK (priority BETWEEN 1 AND 10),
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE(project_id, number)
    )
  `);

  // ── Migrate: add columns to tasks ────────────────────────
  const taskCols = db.query("PRAGMA table_info(tasks)").all() as { name: string }[];
  const colNames = new Set(taskCols.map((c) => c.name));
  if (!colNames.has("number")) {
    db.run("ALTER TABLE tasks ADD COLUMN number INTEGER");
    // Backfill: assign sequential numbers per project for existing tasks
    db.run(`
      UPDATE tasks SET number = (
        SELECT COUNT(*) FROM tasks t2
        WHERE t2.project_id = tasks.project_id AND t2.rowid <= tasks.rowid
      )
      WHERE number IS NULL
    `);
  }
  if (!colNames.has("priority")) {
    db.run("ALTER TABLE tasks ADD COLUMN priority INTEGER CHECK (priority BETWEEN 1 AND 10)");
  }
  if (!colNames.has("type")) {
    db.run("ALTER TABLE tasks ADD COLUMN type TEXT CHECK (type IN ('research', 'implementation', 'review', 'design', 'planning', 'testing', 'documentation'))");
  }
  if (!colNames.has("effort")) {
    db.run("ALTER TABLE tasks ADD COLUMN effort TEXT CHECK (effort IN ('trivial', 'low', 'moderate', 'high', 'extreme'))");
  }

  db.run("CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_tasks_project_number ON tasks(project_id, number)");

  // ── Tags ──────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      prefix     TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // ── Migrate: add prefix column to tags ──────────────────
  const tagCols = db.query("PRAGMA table_info(tags)").all() as { name: string }[];
  const tagColNames = new Set(tagCols.map((c) => c.name));
  if (!tagColNames.has("prefix")) {
    db.run("ALTER TABLE tags ADD COLUMN prefix TEXT");
    // Backfill prefix for existing tags that contain a colon
    db.run("UPDATE tags SET prefix = SUBSTR(name, 1, INSTR(name, ':') - 1) WHERE INSTR(name, ':') > 0");
  }

  db.run("CREATE INDEX IF NOT EXISTS idx_tags_prefix ON tags(prefix)");

  db.run(`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id)");
}
