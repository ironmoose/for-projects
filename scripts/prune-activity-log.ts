/**
 * Standalone script to prune old activity_log entries.
 *
 * Usage:
 *   bun scripts/prune-activity-log.ts [--retention-days N] [--batch-size N] [--dry-run]
 *
 * Requires SQLITE_PATH env var pointing at the SQLite database.
 */

import { createDatabase } from "../src/domain/db/connection";
import { parseArgs } from "node:util";

function main(): void {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "retention-days": { type: "string", default: "30" },
      "batch-size": { type: "string", default: "1000" },
      "dry-run": { type: "boolean", default: false },
    },
    strict: true,
  });

  const retentionDays = parseInt(values["retention-days"] ?? "30", 10);
  const batchSize = parseInt(values["batch-size"] ?? "1000", 10);
  const dryRun = values["dry-run"] ?? false;

  if (isNaN(retentionDays) || retentionDays < 0) {
    console.error("Error: --retention-days must be a non-negative integer");
    process.exit(1);
  }
  if (isNaN(batchSize) || batchSize < 1) {
    console.error("Error: --batch-size must be a positive integer");
    process.exit(1);
  }

  const threshold = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  console.log(`Retention: ${retentionDays} days`);
  console.log(`Threshold: ${threshold}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Dry run: ${dryRun}`);
  console.log();

  const db = createDatabase();

  const countStmt = db.prepare<{ count: number }, [string]>(
    "SELECT COUNT(*) as count FROM activity_log WHERE created_at < ?",
  );
  const { count: eligible } = countStmt.get(threshold) ?? { count: 0 };
  console.log(`Records eligible for deletion: ${eligible}`);

  if (dryRun) {
    console.log("Dry run — no records deleted.");
    db.close();
    process.exit(0);
  }

  if (eligible === 0) {
    console.log("Nothing to prune.");
    db.close();
    process.exit(0);
  }

  const deleteStmt = db.prepare<void, [string, number]>(
    "DELETE FROM activity_log WHERE id IN (SELECT id FROM activity_log WHERE created_at < ? LIMIT ?)",
  );

  const start = performance.now();
  let totalDeleted = 0;

  while (totalDeleted < eligible) {
    const result = deleteStmt.run(threshold, batchSize);
    const affected = result.changes;
    if (affected === 0) break;
    totalDeleted += affected;
    console.log(`  Deleted batch: ${affected} (total so far: ${totalDeleted})`);
  }

  const elapsed = ((performance.now() - start) / 1000).toFixed(2);

  console.log();
  console.log(`Summary:`);
  console.log(`  Records eligible: ${eligible}`);
  console.log(`  Records deleted:  ${totalDeleted}`);
  console.log(`  Duration:         ${elapsed}s`);

  db.close();
  process.exit(0);
}

try {
  main();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Fatal error: ${message}`);
  process.exit(1);
}
