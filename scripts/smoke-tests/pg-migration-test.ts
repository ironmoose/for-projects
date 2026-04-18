/**
 * Test the Postgres migration system end-to-end.
 *
 * Usage: bun scripts/pg-migration-test.ts
 *
 * Connects to the local Docker Postgres (default docker-compose credentials),
 * drops and recreates the database, runs migrations, verifies the result.
 */
import { createPgClient, pgHealthCheck, pgShutdown } from "../../src/domain/db/pg-connection";
import { runPgMigrations } from "../../src/domain/db/pg-migrator";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://tab_projects:tab_projects@localhost:3001/tab_projects";

const sql = createPgClient({ databaseUrl: DATABASE_URL });

// -- Preflight ----------------------------------------------------------------

const healthy = await pgHealthCheck(sql);
if (!healthy) {
  console.error("Cannot connect to Postgres at", DATABASE_URL);
  console.error("Is docker-compose up?");
  await pgShutdown(sql);
  process.exit(1);
}

// -- Clean slate --------------------------------------------------------------

console.log("Dropping all tables for a clean test...");
await sql.unsafe(`
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  CREATE EXTENSION IF NOT EXISTS vector;
`);

// -- First run: should apply all migrations -----------------------------------

console.log("\n--- First run ---");
await runPgMigrations(sql);

const applied = await sql<{ filename: string }[]>`
  SELECT filename FROM schema_migrations ORDER BY filename
`;
console.log(`Applied ${applied.length} migration(s):`, applied.map((r) => r.filename));

if (applied.length === 0) {
  console.error("FAIL: no migrations were applied");
  await pgShutdown(sql);
  process.exit(1);
}

// -- Second run: should be a no-op --------------------------------------------

console.log("\n--- Second run (idempotency) ---");
await runPgMigrations(sql);

const appliedAgain = await sql<{ filename: string }[]>`
  SELECT filename FROM schema_migrations ORDER BY filename
`;

if (appliedAgain.length !== applied.length) {
  console.error(`FAIL: migration count changed from ${applied.length} to ${appliedAgain.length}`);
  await pgShutdown(sql);
  process.exit(1);
}
console.log("No new migrations applied (correct)");

// -- Verify expected tables ---------------------------------------------------

const tables = await sql<{ tablename: string }[]>`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`;
const tableNames = tables.map((t) => t.tablename);
console.log("\nTables:", tableNames.join(", "));

const expected = [
  "projects", "tasks", "documents", "tags", "entity_tags",
  "project_documents", "task_dependencies", "activity_log", "schema_migrations",
];
const missing = expected.filter((t) => !tableNames.includes(t));
if (missing.length > 0) {
  console.error("FAIL: missing tables:", missing);
  await pgShutdown(sql);
  process.exit(1);
}

// -- Verify vector columns ----------------------------------------------------

const vectors = await sql`
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE udt_name = 'vector'
  ORDER BY table_name
`;
console.log("Vector columns:", vectors.map((v) => `${v.table_name}.${v.column_name}`).join(", "));

const expectedVectors = ["documents.embedding", "projects.embedding", "tasks.embedding"];
const actualVectors = vectors.map((v) => `${v.table_name}.${v.column_name}`).sort();
const missingVectors = expectedVectors.filter((v) => !actualVectors.includes(v));
if (missingVectors.length > 0) {
  console.error("FAIL: missing vector columns:", missingVectors);
  await pgShutdown(sql);
  process.exit(1);
}

// -- Done ---------------------------------------------------------------------

console.log("\nAll checks passed.");
await pgShutdown(sql);
