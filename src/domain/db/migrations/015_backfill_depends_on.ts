import type { Database } from "bun:sqlite";

/**
 * Migration 015: Backfill task_dependencies from depends_on column.
 *
 * Migration 013 created the task_dependencies table but did not migrate
 * existing data from the depends_on column. Migration 014 drops depends_on.
 * This migration bridges the gap: if depends_on still exists (014 not yet
 * applied), it migrates comma-separated values into task_dependencies.
 * If depends_on is already gone, this is a safe no-op.
 */
export function up(db: Database): void {
  const columns = db
    .query("PRAGMA table_info(tasks)")
    .all() as { name: string }[];

  const hasDependsOn = columns.some((c) => c.name === "depends_on");

  if (!hasDependsOn) {
    return;
  }

  db.exec(`
    WITH RECURSIVE split(task_id, dep_id, rest) AS (
      SELECT id,
        CASE WHEN INSTR(depends_on, ',') > 0
             THEN TRIM(SUBSTR(depends_on, 1, INSTR(depends_on, ',') - 1))
             ELSE TRIM(depends_on)
        END,
        CASE WHEN INSTR(depends_on, ',') > 0
             THEN SUBSTR(depends_on, INSTR(depends_on, ',') + 1)
             ELSE NULL
        END
      FROM tasks
      WHERE depends_on IS NOT NULL AND TRIM(depends_on) != ''
      UNION ALL
      SELECT task_id,
        CASE WHEN INSTR(rest, ',') > 0
             THEN TRIM(SUBSTR(rest, 1, INSTR(rest, ',') - 1))
             ELSE TRIM(rest)
        END,
        CASE WHEN INSTR(rest, ',') > 0
             THEN SUBSTR(rest, INSTR(rest, ',') + 1)
             ELSE NULL
        END
      FROM split
      WHERE rest IS NOT NULL
    )
    INSERT OR IGNORE INTO task_dependencies (source_task_id, target_task_id, dependency_type, created_at)
    SELECT dep_id, task_id, 'blocks', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    FROM split
    WHERE dep_id != task_id
      AND dep_id IN (SELECT id FROM tasks);
  `);
}
