import type { Database } from "bun:sqlite";
import { PROJECT_STATUSES, TASK_STATUSES } from "../statuses";

const projectStatusCheck = PROJECT_STATUSES.map((s) => `'${s}'`).join(", ");
const taskStatusCheck = TASK_STATUSES.map((s) => `'${s}'`).join(", ");

export function runMigrations(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      slug        TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN (${projectStatusCheck})),
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug)");

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'todo'
                  CHECK (status IN (${taskStatusCheck})),
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)");
}
