import { describe, it, expect, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { ulid } from "ulid";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runMigrations } from "./migrator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function getAllUserTables(db: Database): string[] {
  const rows = db
    .query(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_migrations' ORDER BY name"
    )
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("migrator", () => {
  let db: Database;
  let cleanup: () => void;

  afterEach(() => {
    cleanup?.();
  });

  it("migration 001 applies cleanly", async () => {
    ({ db, cleanup } = createTestDb());
    await runMigrations(db);

    const tables = getAllUserTables(db);
    expect(tables).toEqual(["projects", "tasks"]);
  });

  it("running migrations twice is idempotent", async () => {
    ({ db, cleanup } = createTestDb());
    await runMigrations(db);

    // Seed some data
    const projectId = ulid();
    const now = new Date().toISOString();
    db.run(
      "INSERT INTO projects (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
      [projectId, "Test", now, now]
    );

    const countBefore = (
      db.query("SELECT COUNT(*) as cnt FROM projects").get() as { cnt: number }
    ).cnt;

    // Second run should be a no-op
    await runMigrations(db);

    const countAfter = (
      db.query("SELECT COUNT(*) as cnt FROM projects").get() as { cnt: number }
    ).cnt;
    expect(countAfter).toBe(countBefore);
  });

  it("all tables exist after migration", async () => {
    ({ db, cleanup } = createTestDb());
    await runMigrations(db);

    const tables = getAllUserTables(db);
    expect(tables).toContain("projects");
    expect(tables).toContain("tasks");
  });

  it("foreign key: task with bad project_id fails", async () => {
    ({ db, cleanup } = createTestDb());
    await runMigrations(db);

    const now = new Date().toISOString();
    expect(() =>
      db.run(
        "INSERT INTO tasks (id, project_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [ulid(), "nonexistent-project", "Bad task", now, now]
      )
    ).toThrow();
  });
});
