import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const DEFAULT_DB_PATH = join(homedir(), ".tab", "project-management", "sqlite.db");

export function getDbPath(): string {
  return process.env.SQLITE_PATH ?? DEFAULT_DB_PATH;
}

export function createDatabase(dbPath?: string): Database {
  const resolvedPath = dbPath ?? getDbPath();
  mkdirSync(join(resolvedPath, ".."), { recursive: true });

  const db = new Database(resolvedPath);
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");

  return db;
}
