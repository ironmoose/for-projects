/**
 * End-to-end smoke test for the Postgres -> SQLite migration.
 *
 * Usage: bun scripts/smoke-tests/pg-to-sqlite-test.ts
 *
 * Requires docker-compose Postgres running at localhost:3001 (the default
 * tab_projects/tab_projects credentials). The test:
 *   1. Drops & recreates the public schema and reinitializes pg.
 *   2. Inserts a small fixture into Postgres.
 *   3. Opens a fresh SQLite db, runs schema migrations, calls migratePgToSqlite.
 *   4. Asserts row counts match and that no embedding column leaked into SQLite.
 *   5. Re-runs the migration and asserts idempotency (no doubled rows).
 *   6. Cleans up the temp .db file and the Postgres schema.
 */
import { Database } from "bun:sqlite";
import { existsSync, unlinkSync } from "node:fs";
import {
  createPgClient,
  pgHealthCheck,
  pgShutdown,
  initPgSchema,
} from "../../src/domain/db/pg-connection";
import { runMigrations } from "../../src/domain/db/migrator";
import { migratePgToSqlite } from "../../src/domain/db/pg-to-sqlite";

async function unlinkWithRetry(path: string, attempts = 5): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      if (existsSync(path)) unlinkSync(path);
      return;
    } catch (err) {
      if (i === attempts - 1) {
        console.warn(`could not delete ${path}: ${(err as Error).message}`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://tab_projects:tab_projects@localhost:3001/tab_projects";

const SQLITE_PATH = "./data/pg-to-sqlite-smoke.db";

// Stable 26-char ULID-shaped placeholders. Real ULIDs aren't required - the
// migration only treats these as opaque TEXT.
const PROJECT_ID = "01TESTPROJECT0000000000000";
const TASK_A_ID = "01TESTTASKAAAA000000000000";
const TASK_B_ID = "01TESTTASKBBBB000000000000";
const DOCUMENT_ID = "01TESTDOCUMENT000000000000";
const TAG_ID = "01TESTTAG00000000000000000";
const AUTOMATION_ID = "01TESTAUTOMATION0000000000";
const ACTIVITY_ID = "01TESTACTIVITY000000000000";

const pg = createPgClient({ databaseUrl: DATABASE_URL });
let sqlite: Database | null = null;
let testFailed = false;

function fail(msg: string): never {
  testFailed = true;
  console.error(`FAIL: ${msg}`);
  throw new Error(msg);
}

// -- Preflight ----------------------------------------------------------------

const healthy = await pgHealthCheck(pg);
if (!healthy) {
  console.error("Cannot connect to Postgres at", DATABASE_URL);
  console.error("Is docker-compose up?");
  await pgShutdown(pg);
  process.exit(1);
}

try {

// -- Clean Postgres slate -----------------------------------------------------

console.log("Dropping and recreating public schema...");
await pg.unsafe(`
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  CREATE EXTENSION IF NOT EXISTS vector;
`);
await initPgSchema(pg);

// -- Insert fixture into Postgres --------------------------------------------

console.log("Seeding Postgres fixture...");

await pg`
  INSERT INTO projects (id, title, summary, created_at, updated_at)
  VALUES (${PROJECT_ID}, ${"Smoke Test Project"}, ${"a project for the pg->sqlite smoke test"}, NOW(), NOW())
`;

await pg`
  INSERT INTO tasks (id, project_id, title, status, is_blocked, created_at, updated_at)
  VALUES
    (${TASK_A_ID}, ${PROJECT_ID}, ${"Task A"}, ${"todo"}, ${false}, NOW(), NOW()),
    (${TASK_B_ID}, ${PROJECT_ID}, ${"Task B"}, ${"in_progress"}, ${true}, NOW(), NOW())
`;

await pg`
  INSERT INTO documents (id, title, summary, content, favorite, created_at, updated_at)
  VALUES (${DOCUMENT_ID}, ${"Smoke Doc"}, ${"summary"}, ${"# content"}, ${true}, NOW(), NOW())
`;

await pg`
  INSERT INTO tags (id, kind, created_at)
  VALUES (${TAG_ID}, ${"smoke-tag"}, NOW())
`;

await pg`
  INSERT INTO entity_tags (entity_type, entity_id, tag_id)
  VALUES (${"document"}, ${DOCUMENT_ID}, ${TAG_ID})
`;

await pg`
  INSERT INTO project_documents (project_id, document_id)
  VALUES (${PROJECT_ID}, ${DOCUMENT_ID})
`;

await pg`
  INSERT INTO automations (id, title, prompt, is_favorite, created_at, updated_at)
  VALUES (${AUTOMATION_ID}, ${"Smoke Automation"}, ${"do the thing"}, ${false}, NOW(), NOW())
`;

await pg`
  INSERT INTO activity_log (id, entity_type, entity_id, action, summary, created_at)
  VALUES (${ACTIVITY_ID}, ${"project"}, ${PROJECT_ID}, ${"created"}, ${"smoke test created project"}, NOW())
`;

await pg`
  INSERT INTO task_dependencies (source_task_id, target_task_id, dependency_type, created_at)
  VALUES (${TASK_A_ID}, ${TASK_B_ID}, ${"blocks"}, NOW())
`;

const expectedCounts: Record<string, number> = {
  projects: 1,
  tasks: 2,
  documents: 1,
  tags: 1,
  entity_tags: 1,
  project_documents: 1,
  task_dependencies: 1,
  automations: 1,
  activity_log: 1,
};

// -- Open a fresh SQLite db and run migrations --------------------------------

await unlinkWithRetry(SQLITE_PATH);
await unlinkWithRetry(`${SQLITE_PATH}-shm`);
await unlinkWithRetry(`${SQLITE_PATH}-wal`);

sqlite = new Database(SQLITE_PATH, { create: true });
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA foreign_keys = OFF");

console.log("Running SQLite schema migrations...");
await runMigrations(sqlite);

// -- First migration ---------------------------------------------------------

console.log("\n--- First migration run ---");
const firstResults = await migratePgToSqlite(pg, sqlite);
for (const r of firstResults) {
  console.log(`  ${r.table.padEnd(24)} ${String(r.rows).padStart(6)} rows`);
}

// -- Verify row counts in SQLite ----------------------------------------------

for (const [table, expected] of Object.entries(expectedCounts)) {
  const [row] = sqlite
    .query(`SELECT COUNT(*) as count FROM ${table}`)
    .all() as { count: number }[];
  if (row.count !== expected) {
    fail(`row count mismatch in ${table}: expected ${expected}, got ${row.count}`);
  }
}
console.log("Row counts match expected fixture");

// -- Field equivalence ---------------------------------------------------------

const projectRow = sqlite.prepare("SELECT title, summary FROM projects WHERE id = ?").get(PROJECT_ID) as { title: string; summary: string };
if (projectRow.title !== "Smoke Test Project" || projectRow.summary !== "a project for the pg->sqlite smoke test") {
  fail(`Project content mismatch: got ${JSON.stringify(projectRow)}`);
}

const taskBRow = sqlite.prepare("SELECT title, status, is_blocked FROM tasks WHERE id = ?").get(TASK_B_ID) as { title: string; status: string; is_blocked: number };
if (taskBRow.title !== "Task B" || taskBRow.status !== "in_progress" || taskBRow.is_blocked !== 1) {
  fail(`Task B content mismatch: got ${JSON.stringify(taskBRow)}`);
}

const taskARow = sqlite.prepare("SELECT is_blocked FROM tasks WHERE id = ?").get(TASK_A_ID) as { is_blocked: number };
if (taskARow.is_blocked !== 0) {
  fail(`Task A is_blocked should be 0, got ${taskARow.is_blocked}`);
}

const docRow = sqlite.prepare("SELECT favorite FROM documents WHERE id = ?").get(DOCUMENT_ID) as { favorite: number };
if (docRow.favorite !== 0 && docRow.favorite !== 1) {
  fail(`Document favorite should be 0 or 1 (got ${docRow.favorite}, type ${typeof docRow.favorite})`);
}

const automationRow = sqlite.prepare("SELECT is_favorite FROM automations WHERE id = ?").get(AUTOMATION_ID) as { is_favorite: number };
if (automationRow.is_favorite !== 0 && automationRow.is_favorite !== 1) {
  fail(`Automation is_favorite should be 0 or 1 (got ${automationRow.is_favorite}, type ${typeof automationRow.is_favorite})`);
}
console.log("Field equivalence and boolean coercion verified");

// -- Timestamp ISO format ------------------------------------------------------

const tsRow = sqlite.prepare("SELECT created_at FROM projects WHERE id = ?").get(PROJECT_ID) as { created_at: string };
const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
if (!ISO_REGEX.test(tsRow.created_at)) {
  fail(`created_at not ISO 8601 UTC: ${tsRow.created_at}`);
}
console.log("Timestamp format verified");

// -- task_dependencies roundtrip ----------------------------------------------

const depRow = sqlite.prepare("SELECT dependency_type FROM task_dependencies WHERE source_task_id = ? AND target_task_id = ?").get(TASK_A_ID, TASK_B_ID) as { dependency_type: string };
if (depRow.dependency_type !== "blocks") {
  fail(`task_dependencies content mismatch: got ${JSON.stringify(depRow)}`);
}
console.log("task_dependencies roundtripped");

// -- Verify embedding columns did NOT leak into SQLite ------------------------

for (const table of ["projects", "tasks", "documents"] as const) {
  const cols = (sqlite
    .query(`PRAGMA table_info(${table})`)
    .all() as { name: string }[]).map((r) => r.name);
  if (cols.includes("embedding")) {
    fail(`SQLite ${table} unexpectedly has an 'embedding' column`);
  }
}
console.log("No embedding columns leaked into SQLite");

// -- Idempotency: re-run and confirm row counts didn't double -----------------

console.log("\n--- Second migration run (idempotency) ---");
await migratePgToSqlite(pg, sqlite);

for (const [table, expected] of Object.entries(expectedCounts)) {
  const [row] = sqlite
    .query(`SELECT COUNT(*) as count FROM ${table}`)
    .all() as { count: number }[];
  if (row.count !== expected) {
    fail(`idempotency check failed for ${table}: expected ${expected}, got ${row.count} after second run`);
  }
}
console.log("Idempotency holds - no duplicated rows on second run");

} finally {
  // -- Cleanup ----------------------------------------------------------------
  if (sqlite) {
    try { sqlite.close(); } catch { /* ignore */ }
  }
  await unlinkWithRetry(SQLITE_PATH);
  await unlinkWithRetry(`${SQLITE_PATH}-shm`);
  await unlinkWithRetry(`${SQLITE_PATH}-wal`);

  try {
    await pg.unsafe(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
    `);
  } catch { /* ignore - pg may already be unhealthy */ }

  await pgShutdown(pg);
}

if (testFailed) {
  process.exit(1);
}

console.log("\nOK: pg-to-sqlite smoke test passed");
