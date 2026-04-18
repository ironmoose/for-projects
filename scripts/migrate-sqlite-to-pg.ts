/**
 * Migrate data from SQLite to Postgres.
 *
 * Usage:
 *   SQLITE_PATH=./data/sqlite.db DATABASE_URL=postgresql://... bun scripts/migrate-sqlite-to-pg.ts [--commit]
 *
 * Without --commit, runs in dry-run mode (reads SQLite, reports counts, no writes).
 */
import { Database } from "bun:sqlite";
import { createPgClient, initPgSchema, pgShutdown, pgHealthCheck } from "../src/domain/db/pg-connection";
import { migrateSqliteToPg } from "../src/domain/db/sqlite-to-pg";

const sqlitePath = process.env.SQLITE_PATH;
const databaseUrl = process.env.DATABASE_URL;
const commit = process.argv.includes("--commit");

if (!sqlitePath) { console.error("SQLITE_PATH not set"); process.exit(1); }
if (!databaseUrl) { console.error("DATABASE_URL not set"); process.exit(1); }

const lite = new Database(sqlitePath, { readonly: true });
lite.run("PRAGMA foreign_keys = OFF");

const pg = createPgClient({ databaseUrl });

const healthy = await pgHealthCheck(pg);
if (!healthy) {
  console.error("Cannot connect to Postgres");
  lite.close();
  await pgShutdown(pg);
  process.exit(1);
}

await initPgSchema(pg);

console.log(`\n${commit ? "LIVE MODE" : "DRY RUN"} — migrating ${sqlitePath} → Postgres\n`);

if (commit) {
  const results = await migrateSqliteToPg(lite, pg);

  console.log("\n--- Summary ---");
  let total = 0;
  for (const r of results) {
    console.log(`  ${r.table.padEnd(24)} ${String(r.rows).padStart(6)} rows`);
    total += r.rows;
  }
  console.log(`  ${"TOTAL".padEnd(24)} ${String(total).padStart(6)} rows`);
} else {
  // Dry run — just report row counts from SQLite
  const tables = ["projects", "tasks", "documents", "tags", "entity_tags", "project_documents", "task_dependencies", "activity_log"];
  let total = 0;
  for (const table of tables) {
    try {
      const [row] = lite.query(`SELECT COUNT(*) as count FROM ${table}`).all() as { count: number }[];
      console.log(`  ${table.padEnd(24)} ${String(row.count).padStart(6)} rows`);
      total += row.count;
    } catch {
      console.log(`  ${table.padEnd(24)}      - (not found)`);
    }
  }
  console.log(`  ${"TOTAL".padEnd(24)} ${String(total).padStart(6)} rows`);
  console.log("\nDry run complete. Run with --commit to write to Postgres.");
}

lite.close();
await pgShutdown(pg);
