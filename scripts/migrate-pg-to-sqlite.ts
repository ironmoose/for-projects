/**
 * Migrate data from Postgres to SQLite.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... SQLITE_PATH=./data/sqlite.db bun scripts/migrate-pg-to-sqlite.ts [--commit]
 *
 * Without --commit, runs in dry-run mode (reads Postgres, reports counts, no writes).
 *
 * Caveat: pgvector embedding data does NOT round-trip through SQLite (SQLite
 * has no embedding column). If you intend to migrate pg -> sqlite -> pg
 * later, run `scripts/regenerate-embeddings.sh` after the return trip to
 * rebuild vectors.
 */
import { Database } from "bun:sqlite";
import { createPgClient, pgShutdown, pgHealthCheck } from "../src/domain/db/pg-connection";
import { runMigrations } from "../src/domain/db/migrator";
import { migratePgToSqlite } from "../src/domain/db/pg-to-sqlite";

const sqlitePath = process.env.SQLITE_PATH;
const databaseUrl = process.env.DATABASE_URL;
const commit = process.argv.includes("--commit");

if (!databaseUrl) { console.error("DATABASE_URL not set"); process.exit(1); }
if (!sqlitePath) { console.error("SQLITE_PATH not set"); process.exit(1); }

const pg = createPgClient({ databaseUrl });

try {
  const healthy = await pgHealthCheck(pg);
  if (!healthy) {
    console.error("Cannot connect to Postgres");
    await pgShutdown(pg);
    process.exit(1);
  }

  console.log(`\n${commit ? "LIVE MODE" : "DRY RUN"} -> migrating Postgres -> ${sqlitePath}\n`);

  if (commit) {
    // Caller-owned: open SQLite, set PRAGMAs, run schema migrations, then
    // delegate row-copying to migratePgToSqlite.
    const lite = new Database(sqlitePath, { create: true });
    try {
      lite.run("PRAGMA journal_mode = WAL");
      lite.run("PRAGMA foreign_keys = OFF");

      await runMigrations(lite);

      const results = await migratePgToSqlite(pg, lite);

      console.log("\n--- Summary ---");
      let total = 0;
      for (const r of results) {
        console.log(`  ${r.table.padEnd(24)} ${String(r.rows).padStart(6)} rows`);
        total += r.rows;
      }
      console.log(`  ${"TOTAL".padEnd(24)} ${String(total).padStart(6)} rows`);
    } finally {
      lite.close();
    }
  } else {
    // Dry run - just report row counts from Postgres
    const tables = ["projects", "tasks", "documents", "tags", "entity_tags", "project_documents", "task_dependencies", "automations", "activity_log"];
    let total = 0;
    for (const table of tables) {
      try {
        const [row] = await pg.unsafe(`SELECT COUNT(*) as count FROM ${table}`) as { count: string }[];
        const count = Number(row.count);
        console.log(`  ${table.padEnd(24)} ${String(count).padStart(6)} rows`);
        total += count;
      } catch {
        console.log(`  ${table.padEnd(24)}      - (not found)`);
      }
    }
    console.log(`  ${"TOTAL".padEnd(24)} ${String(total).padStart(6)} rows`);
    console.log("\nDry run complete. Run with --commit to write to SQLite.");
  }
} finally {
  await pgShutdown(pg);
}
