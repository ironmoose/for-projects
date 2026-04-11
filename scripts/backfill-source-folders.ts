#!/usr/bin/env bun
/**
 * Backfill nested folder paths for sourced documents.
 *
 * Re-derives the folder from each document's source_url using deriveSuggestedFolder,
 * so documents get proper nested paths (e.g., "owner-repo/src/components") instead of
 * flat repo-level folders (e.g., "owner/repo" or "owner-repo").
 *
 * Usage:
 *   bun scripts/backfill-source-folders.ts          # dry run
 *   bun scripts/backfill-source-folders.ts --commit  # apply changes
 */

import { Database } from "bun:sqlite";

const commit = process.argv.includes("--commit");
const dbPath = process.env.SQLITE_PATH ?? "data/tab-projects.db";

// GitHub URL parsing — mirrors src/domain/connectors/github.ts
const GITHUB_BLOB_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/;
const GITHUB_RAW_RE = /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/;
const GITHUB_REPO_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;

function deriveFolder(sourceUrl: string): string | null {
  let m = sourceUrl.match(GITHUB_BLOB_RE);
  if (!m) m = sourceUrl.match(GITHUB_RAW_RE);
  if (m) {
    const owner = m[1].toLowerCase();
    const repo = m[2].toLowerCase();
    const path = m[4];
    const repoPrefix = `${owner}-${repo}`;
    const parts = path.split("/");
    if (parts.length <= 1) return repoPrefix;
    const dirPath = parts.slice(0, -1).join("/").toLowerCase();
    return `${repoPrefix}/${dirPath}`;
  }

  m = sourceUrl.match(GITHUB_REPO_RE);
  if (m) return `${m[1]}-${m[2]}`.toLowerCase();

  return null;
}

console.log(commit ? "[backfill] COMMIT mode" : "[backfill] DRY RUN — pass --commit to apply");
console.log(`[backfill] Database: ${dbPath}`);

const db = new Database(dbPath);

// Find all sourced documents
const rows = db.query(`
  SELECT id, folder, source_url, source_type
  FROM documents
  WHERE source_type IS NOT NULL AND source_url IS NOT NULL
`).all() as { id: string; folder: string | null; source_url: string; source_type: string }[];

console.log(`[backfill] Found ${rows.length} sourced documents`);

const updates: { id: string; oldFolder: string | null; newFolder: string }[] = [];

for (const row of rows) {
  const newFolder = deriveFolder(row.source_url);
  if (!newFolder) continue;
  if (newFolder === row.folder) continue;
  updates.push({ id: row.id, oldFolder: row.folder, newFolder });
}

console.log(`[backfill] ${updates.length} documents need folder updates`);

if (updates.length === 0) {
  console.log("[backfill] Nothing to do.");
  process.exit(0);
}

// Show samples
const sample = updates.slice(0, 10);
for (const u of sample) {
  console.log(`  ${u.oldFolder ?? "(null)"} → ${u.newFolder}`);
}
if (updates.length > 10) {
  console.log(`  ... and ${updates.length - 10} more`);
}

// Show folder distribution
const folderCounts = new Map<string, number>();
for (const u of updates) {
  folderCounts.set(u.newFolder, (folderCounts.get(u.newFolder) ?? 0) + 1);
}
console.log(`\n[backfill] Will create ${folderCounts.size} distinct folders`);

if (!commit) {
  console.log("\n[backfill] Pass --commit to apply.");
  db.close();
  process.exit(0);
}

// Apply updates directly to SQLite
const now = new Date().toISOString();
const stmt = db.prepare("UPDATE documents SET folder = ?, updated_at = ? WHERE id = ?");

let applied = 0;
for (const u of updates) {
  stmt.run(u.newFolder, now, u.id);
  applied++;
}

console.log(`[backfill] Updated ${applied} documents.`);
db.close();
