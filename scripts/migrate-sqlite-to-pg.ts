/**
 * Migrate data from SQLite to Postgres.
 *
 * Reads all tables from the SQLite database and inserts into Postgres,
 * respecting FK order. Skips schema_migrations (Postgres manages its own).
 *
 * Usage:
 *   SQLITE_PATH=./data/sqlite.db DATABASE_URL=postgresql://... bun scripts/migrate-sqlite-to-pg.ts [--commit]
 *
 * Without --commit, runs in dry-run mode (reads SQLite, reports counts, no writes).
 */
import { Database } from "bun:sqlite";
import { createPgClient, initPgSchema, pgShutdown, pgHealthCheck } from "../src/domain/db/pg-connection";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const sqlitePath = process.env.SQLITE_PATH;
const databaseUrl = process.env.DATABASE_URL;
const commit = process.argv.includes("--commit");

if (!sqlitePath) {
  console.error("SQLITE_PATH not set");
  process.exit(1);
}
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

const lite = new Database(sqlitePath, { readonly: true });
lite.run("PRAGMA foreign_keys = OFF"); // read-only, don't need FK checks

const pg = createPgClient({ databaseUrl });

const healthy = await pgHealthCheck(pg);
if (!healthy) {
  console.error("Cannot connect to Postgres");
  lite.close();
  await pgShutdown(pg);
  process.exit(1);
}

// Ensure Postgres schema is up to date
await initPgSchema(pg);

console.log(`\n${commit ? "🚀 LIVE MODE" : "🔍 DRY RUN"} — migrating ${sqlitePath} → Postgres\n`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Batch size for INSERT statements */
const BATCH_SIZE = 500;

interface MigrationResult {
  table: string;
  rows: number;
  skipped: boolean;
}

const results: MigrationResult[] = [];

/**
 * Migrate a single table. Reads all rows from SQLite, optionally transforms
 * each row, and inserts into Postgres in batches.
 */
async function migrateTable<T extends Record<string, unknown>>(
  table: string,
  options?: {
    /** Column name mapping: SQLite name → Postgres name */
    columnMap?: Record<string, string>;
    /** Transform a row after reading from SQLite */
    transform?: (row: T) => T;
    /** Postgres columns to exclude from insert (e.g. embedding) */
    excludePgColumns?: string[];
  },
): Promise<void> {
  const rows = lite.query(`SELECT * FROM ${table}`).all() as T[];

  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows (skip)`);
    results.push({ table, rows: 0, skipped: true });
    return;
  }

  // Determine columns from the first row
  const sqliteColumns = Object.keys(rows[0]);
  const pgColumns = sqliteColumns.map((col) => options?.columnMap?.[col] ?? col);

  if (!commit) {
    console.log(`  ${table}: ${rows.length} rows (dry run)`);
    results.push({ table, rows: rows.length, skipped: true });
    return;
  }

  // Insert in batches
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const transformed = batch.map((row) => {
      const r = options?.transform ? options.transform(row) : row;
      // Remap column names if needed
      if (options?.columnMap) {
        const mapped: Record<string, unknown> = {};
        for (const [sqliteCol, value] of Object.entries(r)) {
          const pgCol = options.columnMap[sqliteCol] ?? sqliteCol;
          mapped[pgCol] = value;
        }
        return mapped;
      }
      return r;
    });

    // Build a single INSERT with multiple value rows using postgres.js
    // Use ON CONFLICT DO NOTHING so re-runs are safe
    await pg`
      INSERT INTO ${pg(table)} ${pg(transformed as Record<string, unknown>[], ...pgColumns)}
      ON CONFLICT DO NOTHING
    `;
    inserted += batch.length;
  }

  console.log(`  ${table}: ${inserted} rows inserted`);
  results.push({ table, rows: inserted, skipped: false });
}

// ---------------------------------------------------------------------------
// Migration — FK order
// ---------------------------------------------------------------------------

console.log("Migrating tables:\n");

// 1. projects (no FKs)
await migrateTable("projects");

// 2. tasks (FK → projects)
await migrateTable("tasks", {
  transform: (row) => ({
    ...row,
    is_blocked: !!row.is_blocked, // INTEGER → boolean
  }),
});

// 3. documents (no FKs)
await migrateTable("documents", {
  transform: (row) => ({
    ...row,
    favorite: !!row.favorite, // INTEGER → boolean
  }),
});

// 4. tags (no FKs)
await migrateTable("tags");

// 5. entity_tags (FK → tags)
await migrateTable("entity_tags");

// 6. document_references (FK → documents)
await migrateTable("document_references");

// 7. task_dependencies (FK → tasks)
await migrateTable("task_dependencies");

// 8. activity_log (no FKs, but last since it's the largest and least critical)
await migrateTable("activity_log");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n--- Summary ---");
const totalRows = results.reduce((sum, r) => sum + r.rows, 0);
for (const r of results) {
  const status = r.skipped ? (r.rows === 0 ? "empty" : "dry run") : "✓";
  console.log(`  ${r.table.padEnd(24)} ${String(r.rows).padStart(6)} rows  ${status}`);
}
console.log(`  ${"TOTAL".padEnd(24)} ${String(totalRows).padStart(6)} rows`);

if (!commit) {
  console.log("\nDry run complete. Run with --commit to write to Postgres.");
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

lite.close();
await pgShutdown(pg);
