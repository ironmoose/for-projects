import { describe, it, expect, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { ulid } from "ulid";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runMigrations } from "./migrator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIGRATIONS_DIR = join(import.meta.dir, "migrations");

function createTestDb(): { db: Database; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "migration-testing-"));
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

/**
 * Apply all SQL and TS migrations up to (and including) a given prefix number.
 * This lets us stop at migration 020, seed data, then run the rest.
 */
async function applyMigrationsUpTo(db: Database, maxNumber: number): Promise<void> {
  // Ensure the migrations tracking table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  const { readdirSync } = await import("node:fs");
  const { extname } = await import("node:path");

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f: string) => [".sql", ".ts"].includes(extname(f)))
    .sort();

  db.run("PRAGMA foreign_keys = OFF");

  for (const filename of files) {
    const num = parseInt(filename.split("_")[0], 10);
    if (num > maxNumber) break;

    if (extname(filename) === ".ts") {
      const mod = await import(join(MIGRATIONS_DIR, filename));
      if (typeof mod.up === "function") {
        db.transaction(() => {
          mod.up(db);
          db.run("INSERT INTO schema_migrations (filename) VALUES (?)", [filename]);
        })();
      }
    } else {
      const sql = readFileSync(join(MIGRATIONS_DIR, filename), "utf-8");
      db.transaction(() => {
        db.exec(sql);
        db.run("INSERT INTO schema_migrations (filename) VALUES (?)", [filename]);
      })();
    }
  }

  db.run("PRAGMA foreign_keys = ON");
}

/**
 * Apply only migrations 021 and 022 (the text-blob-to-document migrations).
 * Assumes migrations 001-020 are already applied.
 */
async function applyTextBlobMigrations(db: Database): Promise<void> {
  db.run("PRAGMA foreign_keys = OFF");

  for (const filename of [
    "021_migrate_project_text_blobs.ts",
    "022_migrate_task_text_blobs.ts",
  ]) {
    const mod = await import(join(MIGRATIONS_DIR, filename));
    db.transaction(() => {
      mod.up(db);
      db.run("INSERT INTO schema_migrations (filename) VALUES (?)", [filename]);
    })();
  }

  db.run("PRAGMA foreign_keys = ON");
}

const NOW = "2026-04-04T00:00:00.000Z";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("text-to-document data migrations (021 + 022)", () => {
  let db: Database;
  let cleanup: () => void;

  // IDs for seeded entities
  const PROJECT_A_ID = ulid();
  const PROJECT_B_ID = ulid();
  const PROJECT_C_ID = ulid();
  const TASK_X_ID = ulid();
  const TASK_Y_ID = ulid();
  const TASK_Z_ID = ulid();

  afterEach(() => {
    cleanup?.();
  });

  /**
   * Seed test data into the old schema (migrations 001-020 applied, text blob
   * columns still present on projects and tasks).
   */
  function seedTestData(): void {
    // Projects
    const insertProject = db.prepare(
      `INSERT INTO projects (id, title, goal, requirements, design, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    insertProject.run(PROJECT_A_ID, "Project A", "G1", "R1", "D1", NOW, NOW);
    insertProject.run(PROJECT_B_ID, "Project B", "G2", null, null, NOW, NOW);
    insertProject.run(PROJECT_C_ID, "Project C", null, null, null, NOW, NOW);

    // Tasks
    const insertTask = db.prepare(
      `INSERT INTO tasks (id, project_id, title, plan, description, implementation, acceptance_criteria, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?)`
    );
    insertTask.run(TASK_X_ID, PROJECT_A_ID, "Task X", "P1", "Desc1", "Impl1", "AC1", NOW, NOW);
    insertTask.run(TASK_Y_ID, PROJECT_A_ID, "Task Y", "P2", null, null, null, NOW, NOW);
    insertTask.run(TASK_Z_ID, PROJECT_B_ID, "Task Z", null, null, null, null, NOW, NOW);
  }

  it("migrates text blobs to documents with correct count, content, types, and summaries", async () => {
    ({ db, cleanup } = createTestDb());

    // Apply all migrations up to 020 (before text blob migrations)
    await applyMigrationsUpTo(db, 20);

    // Seed test data in old schema
    seedTestData();

    // Verify seed data is in place
    const projectCount = (db.query("SELECT COUNT(*) as cnt FROM projects").get() as { cnt: number }).cnt;
    expect(projectCount).toBe(3);
    const taskCount = (db.query("SELECT COUNT(*) as cnt FROM tasks").get() as { cnt: number }).cnt;
    expect(taskCount).toBe(3);

    // Run migrations 021 and 022
    await applyTextBlobMigrations(db);

    // -----------------------------------------------------------------------
    // Verify document count
    // -----------------------------------------------------------------------
    // Project A: goal, requirements, design = 3 docs
    // Project B: goal = 1 doc
    // Project C: all null = 0 docs
    // Task X: plan, description, implementation, acceptance_criteria = 4 docs
    // Task Y: plan = 1 doc
    // Task Z: all null = 0 docs
    // Total: 3 + 1 + 4 + 1 = 9
    const docCount = (db.query("SELECT COUNT(*) as cnt FROM documents").get() as { cnt: number }).cnt;
    expect(docCount).toBe(9);

    // -----------------------------------------------------------------------
    // Verify reference count
    // -----------------------------------------------------------------------
    const refCount = (db.query("SELECT COUNT(*) as cnt FROM document_references").get() as { cnt: number }).cnt;
    expect(refCount).toBe(9);

    // -----------------------------------------------------------------------
    // Verify content preservation
    // -----------------------------------------------------------------------
    type RefRow = { entity_type: string; entity_id: string; document_id: string; type: string };
    type DocRow = { id: string; title: string; content: string | null; summary: string | null };

    const refs = db.query("SELECT * FROM document_references ORDER BY entity_type, entity_id, type").all() as RefRow[];

    // Helper: get document content by reference
    function getDocContent(entityType: string, entityId: string, refType: string): string | null {
      const ref = refs.find(
        (r) => r.entity_type === entityType && r.entity_id === entityId && r.type === refType
      );
      if (!ref) return null;
      const doc = db.query("SELECT content FROM documents WHERE id = ?").get(ref.document_id) as DocRow | null;
      return doc?.content ?? null;
    }

    // Helper: get document title by reference
    function getDocTitle(entityType: string, entityId: string, refType: string): string | null {
      const ref = refs.find(
        (r) => r.entity_type === entityType && r.entity_id === entityId && r.type === refType
      );
      if (!ref) return null;
      const doc = db.query("SELECT title FROM documents WHERE id = ?").get(ref.document_id) as DocRow | null;
      return doc?.title ?? null;
    }

    // Project A documents
    expect(getDocContent("project", PROJECT_A_ID, "goal")).toBe("G1");
    expect(getDocContent("project", PROJECT_A_ID, "requirements")).toBe("R1");
    expect(getDocContent("project", PROJECT_A_ID, "design")).toBe("D1");

    // Project B documents
    expect(getDocContent("project", PROJECT_B_ID, "goal")).toBe("G2");

    // Task X documents
    expect(getDocContent("task", TASK_X_ID, "plan")).toBe("P1");
    expect(getDocContent("task", TASK_X_ID, "note")).toBe("Desc1");
    expect(getDocContent("task", TASK_X_ID, "reference")).toBe("Impl1");
    expect(getDocContent("task", TASK_X_ID, "requirements")).toBe("AC1");

    // Task Y documents
    expect(getDocContent("task", TASK_Y_ID, "plan")).toBe("P2");

    // -----------------------------------------------------------------------
    // Verify type mapping
    // -----------------------------------------------------------------------
    // Project A: goal->goal, requirements->requirements, design->design
    const projectARefs = refs.filter((r) => r.entity_type === "project" && r.entity_id === PROJECT_A_ID);
    expect(projectARefs.map((r) => r.type).sort()).toEqual(["design", "goal", "requirements"]);

    // Project B: goal->goal
    const projectBRefs = refs.filter((r) => r.entity_type === "project" && r.entity_id === PROJECT_B_ID);
    expect(projectBRefs.map((r) => r.type)).toEqual(["goal"]);

    // Task X: plan->plan, description->note, implementation->reference, acceptance_criteria->requirements
    const taskXRefs = refs.filter((r) => r.entity_type === "task" && r.entity_id === TASK_X_ID);
    expect(taskXRefs.map((r) => r.type).sort()).toEqual(["note", "plan", "reference", "requirements"]);

    // Task Y: plan->plan
    const taskYRefs = refs.filter((r) => r.entity_type === "task" && r.entity_id === TASK_Y_ID);
    expect(taskYRefs.map((r) => r.type)).toEqual(["plan"]);

    // -----------------------------------------------------------------------
    // Verify title format
    // -----------------------------------------------------------------------
    // The migrations use "{title}: {TypeName}" format
    expect(getDocTitle("project", PROJECT_A_ID, "goal")).toBe("Project A: Goal");
    expect(getDocTitle("project", PROJECT_A_ID, "requirements")).toBe("Project A: Requirements");
    expect(getDocTitle("project", PROJECT_A_ID, "design")).toBe("Project A: Design");
    expect(getDocTitle("project", PROJECT_B_ID, "goal")).toBe("Project B: Goal");
    expect(getDocTitle("task", TASK_X_ID, "plan")).toBe("Task X: Plan");
    expect(getDocTitle("task", TASK_X_ID, "note")).toBe("Task X: Note");
    expect(getDocTitle("task", TASK_X_ID, "reference")).toBe("Task X: Reference");
    expect(getDocTitle("task", TASK_X_ID, "requirements")).toBe("Task X: Requirements");
    expect(getDocTitle("task", TASK_Y_ID, "plan")).toBe("Task Y: Plan");

    // -----------------------------------------------------------------------
    // Verify summary population
    // -----------------------------------------------------------------------
    type SummaryRow = { summary: string | null };

    const projectASummary = (db.query("SELECT summary FROM projects WHERE id = ?").get(PROJECT_A_ID) as SummaryRow).summary;
    expect(projectASummary).toBe("G1");

    const projectBSummary = (db.query("SELECT summary FROM projects WHERE id = ?").get(PROJECT_B_ID) as SummaryRow).summary;
    expect(projectBSummary).toBe("G2");

    const projectCSummary = (db.query("SELECT summary FROM projects WHERE id = ?").get(PROJECT_C_ID) as SummaryRow).summary;
    expect(projectCSummary).toBeNull();

    // Task X: COALESCE(description, plan) = "Desc1"
    const taskXSummary = (db.query("SELECT summary FROM tasks WHERE id = ?").get(TASK_X_ID) as SummaryRow).summary;
    expect(taskXSummary).toBe("Desc1");

    // Task Y: COALESCE(description, plan) = plan = "P2" (description is null)
    const taskYSummary = (db.query("SELECT summary FROM tasks WHERE id = ?").get(TASK_Y_ID) as SummaryRow).summary;
    expect(taskYSummary).toBe("P2");

    // Task Z: both null, summary stays null
    const taskZSummary = (db.query("SELECT summary FROM tasks WHERE id = ?").get(TASK_Z_ID) as SummaryRow).summary;
    expect(taskZSummary).toBeNull();

    // -----------------------------------------------------------------------
    // Verify NULL handling: no documents or references for all-null entities
    // -----------------------------------------------------------------------
    const projectCRefs = refs.filter((r) => r.entity_type === "project" && r.entity_id === PROJECT_C_ID);
    expect(projectCRefs).toHaveLength(0);

    const taskZRefs = refs.filter((r) => r.entity_type === "task" && r.entity_id === TASK_Z_ID);
    expect(taskZRefs).toHaveLength(0);

    // -----------------------------------------------------------------------
    // Verify no orphan documents or references
    // -----------------------------------------------------------------------
    // Every document should have at least one reference
    const orphanDocs = db.query(
      `SELECT d.id FROM documents d
       WHERE NOT EXISTS (
         SELECT 1 FROM document_references r WHERE r.document_id = d.id
       )`
    ).all();
    expect(orphanDocs).toHaveLength(0);

    // Every reference should point to a valid document
    const orphanRefs = db.query(
      `SELECT r.document_id FROM document_references r
       WHERE NOT EXISTS (
         SELECT 1 FROM documents d WHERE d.id = r.document_id
       )`
    ).all();
    expect(orphanRefs).toHaveLength(0);
  });

  it("skips empty string and whitespace-only fields", async () => {
    ({ db, cleanup } = createTestDb());
    await applyMigrationsUpTo(db, 20);

    const projectId = ulid();
    const taskId = ulid();

    // Project with empty and whitespace-only fields
    db.run(
      `INSERT INTO projects (id, title, goal, requirements, design, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [projectId, "Edge Project", "", "  \n\t  ", "Real content", NOW, NOW]
    );

    // Task with empty and whitespace-only fields
    db.run(
      `INSERT INTO tasks (id, project_id, title, plan, description, implementation, acceptance_criteria, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?)`,
      [taskId, projectId, "Edge Task", "", "   ", null, "Real AC", NOW, NOW]
    );

    await applyTextBlobMigrations(db);

    // Only "Real content" (design) from project and "Real AC" (acceptance_criteria) from task
    const docCount = (db.query("SELECT COUNT(*) as cnt FROM documents").get() as { cnt: number }).cnt;
    expect(docCount).toBe(2);

    const refCount = (db.query("SELECT COUNT(*) as cnt FROM document_references").get() as { cnt: number }).cnt;
    expect(refCount).toBe(2);

    // Verify correct documents were created
    type RefRow = { entity_type: string; entity_id: string; document_id: string; type: string };
    const refs = db.query("SELECT * FROM document_references").all() as RefRow[];

    const projectRef = refs.find((r) => r.entity_type === "project" && r.entity_id === projectId);
    expect(projectRef).toBeDefined();
    expect(projectRef!.type).toBe("design");

    const taskRef = refs.find((r) => r.entity_type === "task" && r.entity_id === taskId);
    expect(taskRef).toBeDefined();
    expect(taskRef!.type).toBe("requirements");

    // Verify content is preserved exactly
    const projectDoc = db.query("SELECT content FROM documents WHERE id = ?").get(projectRef!.document_id) as { content: string };
    expect(projectDoc.content).toBe("Real content");

    const taskDoc = db.query("SELECT content FROM documents WHERE id = ?").get(taskRef!.document_id) as { content: string };
    expect(taskDoc.content).toBe("Real AC");
  });

  it("truncates summary to 1000 characters", async () => {
    ({ db, cleanup } = createTestDb());
    await applyMigrationsUpTo(db, 20);

    const projectId = ulid();
    const taskId = ulid();
    const longText = "A".repeat(2000);

    db.run(
      `INSERT INTO projects (id, title, goal, requirements, design, created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, ?, ?)`,
      [projectId, "Long Project", longText, NOW, NOW]
    );

    db.run(
      `INSERT INTO tasks (id, project_id, title, plan, description, implementation, acceptance_criteria, status, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, NULL, NULL, 'todo', ?, ?)`,
      [taskId, projectId, "Long Task", longText, NOW, NOW]
    );

    await applyTextBlobMigrations(db);

    // Summary should be truncated to 1000 chars
    type SummaryRow = { summary: string | null };
    const projectSummary = (db.query("SELECT summary FROM projects WHERE id = ?").get(projectId) as SummaryRow).summary;
    expect(projectSummary).toHaveLength(1000);
    expect(projectSummary).toBe("A".repeat(1000));

    const taskSummary = (db.query("SELECT summary FROM tasks WHERE id = ?").get(taskId) as SummaryRow).summary;
    expect(taskSummary).toHaveLength(1000);
    expect(taskSummary).toBe("A".repeat(1000));

    // Document content should NOT be truncated
    const docContent = db.query("SELECT content FROM documents LIMIT 1").get() as { content: string };
    expect(docContent.content).toHaveLength(2000);
  });
});
