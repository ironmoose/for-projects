/**
 * Postgres -> SQLite data migration.
 *
 * Reads all rows from Postgres tables and inserts them into SQLite in FK
 * order. Uses INSERT OR IGNORE so re-runs are safe (idempotent), matching
 * the forward direction's ON CONFLICT DO NOTHING.
 *
 * Column derivation: per table, we read the SQLite column list at runtime
 * via PRAGMA table_info(<table>) and use that list for both the Postgres
 * SELECT and the SQLite INSERT. This naturally excludes Postgres-only
 * columns (notably `embedding` on projects/tasks/documents) without any
 * hardcoded "skip this column" lists.
 *
 * Caveat: pgvector embedding data does NOT round-trip through SQLite, since
 * SQLite has no embedding column. If you migrate pg -> sqlite -> pg, run
 * `scripts/regenerate-embeddings.sh` afterwards to rebuild the vectors.
 *
 * Caller contract: this module just moves data. The caller (the wrapper
 * script) is responsible for opening the SQLite database, running schema
 * migrations (`runMigrations`), and applying PRAGMAs. Mirrors the contract
 * of `migrateSqliteToPg` in `sqlite-to-pg.ts`.
 */
import type { Database, SQLQueryBindings } from "bun:sqlite";
import type { PgClient } from "./pg-connection";

const BATCH_SIZE = 500;

interface MigrationResult {
  table: string;
  rows: number;
}

/**
 * Return the column names declared for `table` in the SQLite schema.
 *
 * The list is the source of truth for what we copy: Postgres-only columns
 * (e.g. `embedding`) are absent from SQLite, so they are absent here, and
 * therefore excluded from both the SELECT and the INSERT below.
 */
function sqliteColumns(lite: Database, table: string): string[] {
  const rows = lite
    .query(`PRAGMA table_info(${table})`)
    .all() as { name: string }[];
  return rows.map((r) => r.name);
}

async function migrateTable(
  pg: PgClient,
  lite: Database,
  table: string,
): Promise<MigrationResult> {
  const cols = sqliteColumns(lite, table);
  if (cols.length === 0) {
    return { table, rows: 0 };
  }

  // Identifiers come from PRAGMA table_info on a known table, so they are
  // safe to interpolate. Quote with double-quotes for safety against any
  // future column name that happens to be a reserved word.
  const selectCols = cols.map((c) => `"${c}"`).join(", ");
  const rows = (await pg.unsafe(
    `SELECT ${selectCols} FROM ${table}`,
  )) as Record<string, unknown>[];

  if (rows.length === 0) {
    return { table, rows: 0 };
  }

  const placeholders = cols.map(() => "?").join(", ");
  const insertSql = `INSERT OR IGNORE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`;
  const stmt = lite.prepare(insertSql);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    lite.transaction(() => {
      for (const row of batch) {
        const values: SQLQueryBindings[] = cols.map((col) => {
          const v = row[col];
          if (v === undefined || v === null) return null;
          // Postgres returns booleans as JS true/false; SQLite stores as ints.
          if (typeof v === "boolean") return v ? 1 : 0;
          // Postgres returns timestamps as JS Date; SQLite stores ISO 8601.
          if (v instanceof Date) return v.toISOString();
          return v as string | number | bigint;
        });
        stmt.run(...values);
      }
    })();

    inserted += batch.length;
  }

  return { table, rows: inserted };
}

/**
 * Migrate all data from a Postgres database to SQLite.
 *
 * Tables are migrated in FK order. INSERT OR IGNORE makes this idempotent,
 * so re-running on a partially-migrated SQLite db is safe.
 *
 * Returns an array of { table, rows } results.
 */
export async function migratePgToSqlite(
  pg: PgClient,
  lite: Database,
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  // 1. projects (no FKs)
  results.push(await migrateTable(pg, lite, "projects"));

  // 2. tasks (FK -> projects)
  results.push(await migrateTable(pg, lite, "tasks"));

  // 3. documents (no FKs)
  results.push(await migrateTable(pg, lite, "documents"));

  // 4. tags (no FKs)
  results.push(await migrateTable(pg, lite, "tags"));

  // 5. entity_tags (FK -> tags)
  results.push(await migrateTable(pg, lite, "entity_tags"));

  // 6. project_documents (FK -> projects, documents)
  results.push(await migrateTable(pg, lite, "project_documents"));

  // 7. task_dependencies (FK -> tasks)
  results.push(await migrateTable(pg, lite, "task_dependencies"));

  // 8. automations (no FKs)
  results.push(await migrateTable(pg, lite, "automations"));

  // 9. activity_log (no FKs - last since it's largest and least critical)
  results.push(await migrateTable(pg, lite, "activity_log"));

  return results;
}
