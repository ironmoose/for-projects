/**
 * SQLite → Postgres data migration.
 *
 * Reads all rows from SQLite tables and inserts into Postgres in FK order.
 * Uses ON CONFLICT DO NOTHING so re-runs are safe (idempotent).
 */
import { Database } from "bun:sqlite";
import type { PgClient } from "./pg-connection";

const BATCH_SIZE = 500;

interface MigrationResult {
  table: string;
  rows: number;
}

interface TableOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  columnMap?: Record<string, string>;
  transform?: (row: T) => T;
}

async function migrateTable<T extends Record<string, unknown>>(
  lite: Database,
  pg: PgClient,
  table: string,
  options?: TableOptions<T>,
): Promise<MigrationResult> {
  const rows = lite.query(`SELECT * FROM ${table}`).all() as T[];

  if (rows.length === 0) {
    return { table, rows: 0 };
  }

  const sqliteColumns = Object.keys(rows[0]);
  const pgColumns = sqliteColumns.map((col) => options?.columnMap?.[col] ?? col);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const transformed = batch.map((row) => {
      const r = options?.transform ? options.transform(row) : row;
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

    await pg`
      INSERT INTO ${pg(table)} ${pg(transformed as Record<string, unknown>[], ...pgColumns)}
      ON CONFLICT DO NOTHING
    `;
    inserted += batch.length;
  }

  return { table, rows: inserted };
}

/**
 * Migrate all data from a SQLite database to Postgres.
 * Tables are migrated in FK order. ON CONFLICT DO NOTHING makes this idempotent.
 *
 * Returns an array of { table, rows } results.
 */
export async function migrateSqliteToPg(lite: Database, pg: PgClient): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  // 1. projects (no FKs)
  results.push(await migrateTable(lite, pg, "projects"));

  // 2. tasks (FK → projects)
  results.push(await migrateTable(lite, pg, "tasks", {
    transform: (row) => ({ ...row, is_blocked: !!row.is_blocked }),
  }));

  // 3. documents (no FKs)
  results.push(await migrateTable(lite, pg, "documents", {
    transform: (row) => ({ ...row, favorite: !!row.favorite }),
  }));

  // 4. tags (no FKs)
  results.push(await migrateTable(lite, pg, "tags"));

  // 5. entity_tags (FK → tags)
  results.push(await migrateTable(lite, pg, "entity_tags"));

  // 6. project_documents (FK → projects, documents)
  results.push(await migrateTable(lite, pg, "project_documents"));

  // 7. task_dependencies (FK → tasks)
  results.push(await migrateTable(lite, pg, "task_dependencies"));

  // 8. automations (no FKs)
  results.push(await migrateTable(lite, pg, "automations", {
    transform: (row) => ({ ...row, is_favorite: !!row.is_favorite }),
  }));

  // 9. activity_log (no FKs, last since it's largest and least critical)
  results.push(await migrateTable(lite, pg, "activity_log"));

  return results;
}
