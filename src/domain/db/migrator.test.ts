import { describe, test, expect, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { ulid } from "ulid";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runMigrations } from "./migrator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a file-backed SQLite DB in a temp directory (required because
 *  runMigrations tries to copyFileSync the DB before applying pending
 *  migrations, which fails for ":memory:" databases). */
function createTestDb(): { db: Database; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "migrator-test-"));
  const dbPath = join(dir, "test.db");
  const db = new Database(dbPath);
  db.run("PRAGMA foreign_keys = ON");
  return {
    db,
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

function getTableRowCount(db: Database, table: string): number {
  const row = db.query(`SELECT COUNT(*) AS cnt FROM ${table}`).get() as {
    cnt: number;
  };
  return row.cnt;
}

function getAllUserTables(db: Database): string[] {
  const rows = db
    .query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_migrations' ORDER BY name"
    )
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

function seedProjectAndTask(db: Database): { projectId: string; taskId: string } {
  const projectId = ulid();
  const taskId = ulid();
  const now = new Date().toISOString();

  db.run(
    "INSERT INTO projects (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    [projectId, "Test Project", "A test project", "active", now, now]
  );

  db.run(
    "INSERT INTO tasks (id, project_id, number, title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [taskId, projectId, 1, "Test Task", "A test task", "todo", now, now]
  );

  return { projectId, taskId };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("migrator", () => {
  test("running migrations twice is a no-op and preserves data", async () => {
    const { db, cleanup } = createTestDb();
    try {
      // First run: apply all migrations
      await runMigrations(db);

      // Seed data
      seedProjectAndTask(db);

      // Record row counts for every user table
      const tables = getAllUserTables(db);
      const countsBefore: Record<string, number> = {};
      for (const table of tables) {
        countsBefore[table] = getTableRowCount(db, table);
      }

      // Second run: should be a complete no-op
      await runMigrations(db);

      // Assert row counts are unchanged
      const tablesAfter = getAllUserTables(db);
      expect(tablesAfter).toEqual(tables);

      for (const table of tables) {
        expect(getTableRowCount(db, table)).toBe(countsBefore[table]);
      }
    } finally {
      cleanup();
    }
  });

  test("table rebuild does not cascade-delete child rows", async () => {
    const { db, cleanup } = createTestDb();
    try {
      // Apply all migrations to get the final schema
      await runMigrations(db);

      // Seed a project with a task
      const { projectId } = seedProjectAndTask(db);

      const taskCountBefore = getTableRowCount(db, "tasks");
      expect(taskCountBefore).toBe(1);

      // Simulate a table-rebuild migration (same pattern as 010_drop_slug.sql).
      // This is the dangerous operation: if PRAGMA foreign_keys is ON and the
      // rebuild doesn't handle it correctly, SQLite may cascade-delete children
      // when the old parent table is dropped.
      //
      // The safe approach is to disable foreign keys during the rebuild.
      db.run("PRAGMA foreign_keys = OFF");

      db.transaction(() => {
        db.run(`
          CREATE TABLE projects_rebuild (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            status      TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'completed', 'archived')),
            created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
          )
        `);

        db.run(`
          INSERT INTO projects_rebuild (id, name, description, status, created_at, updated_at)
          SELECT id, name, description, status, created_at, updated_at FROM projects
        `);

        db.run("DROP TABLE projects");
        db.run("ALTER TABLE projects_rebuild RENAME TO projects");
      })();

      db.run("PRAGMA foreign_keys = ON");

      // The project should still exist
      const projectCount = getTableRowCount(db, "projects");
      expect(projectCount).toBe(1);

      // The task must survive the rebuild -- this is the critical assertion
      const taskCountAfter = getTableRowCount(db, "tasks");
      expect(taskCountAfter).toBe(taskCountBefore);

      // Verify the FK relationship still works by checking the task references the project
      const task = db
        .query("SELECT project_id FROM tasks WHERE project_id = ?")
        .get(projectId) as { project_id: string } | null;
      expect(task).not.toBeNull();
      expect(task!.project_id).toBe(projectId);
    } finally {
      cleanup();
    }
  });

  test("table rebuild with foreign_keys ON causes cascade deletion", async () => {
    // This test documents the dangerous behavior: if you rebuild a parent
    // table without disabling foreign_keys, child rows are lost.
    const { db, cleanup } = createTestDb();
    try {
      await runMigrations(db);
      seedProjectAndTask(db);

      expect(getTableRowCount(db, "tasks")).toBe(1);

      // Intentionally leave foreign_keys ON during the rebuild
      db.transaction(() => {
        db.run(`
          CREATE TABLE projects_rebuild (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            status      TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'completed', 'archived')),
            created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
            updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
          )
        `);

        db.run(`
          INSERT INTO projects_rebuild (id, name, description, status, created_at, updated_at)
          SELECT id, name, description, status, created_at, updated_at FROM projects
        `);

        db.run("DROP TABLE projects");
        db.run("ALTER TABLE projects_rebuild RENAME TO projects");
      })();

      // With foreign_keys ON, the CASCADE on DROP TABLE wipes child rows
      const taskCountAfter = getTableRowCount(db, "tasks");
      expect(taskCountAfter).toBe(0);
    } finally {
      cleanup();
    }
  });
});
