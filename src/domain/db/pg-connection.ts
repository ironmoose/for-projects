import postgres from "postgres";

export interface PgOptions {
  databaseUrl: string;
  maxConnections?: number;
  idleTimeout?: number;
}

export type PgClient = postgres.Sql;

/**
 * Create a Postgres connection pool from DATABASE_URL.
 *
 * postgres.js manages its own pool internally — no separate pool wrapper needed.
 * The returned `sql` tagged-template is the query interface.
 */
export function createPgClient(options: PgOptions): PgClient {
  const sql = postgres(options.databaseUrl, {
    max: options.maxConnections ?? 10,
    idle_timeout: options.idleTimeout ?? 20,
    connect_timeout: 10,
    types: {
      // pgvector returns vector columns as strings like "[0.1,0.2,...]"
      // Let postgres.js pass them through as-is; we'll parse in the repo layer.
    },
  });

  return sql;
}

/**
 * Run pending Postgres migrations. Re-exported from pg-migrator for convenience.
 */
export { runPgMigrations as initPgSchema } from "./pg-migrator";

/**
 * Health check — runs a trivial query to verify the connection is alive.
 */
export async function pgHealthCheck(sql: PgClient): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Graceful shutdown — drains the connection pool.
 */
export async function pgShutdown(sql: PgClient): Promise<void> {
  await sql.end({ timeout: 5 });
  console.log("[pg] connection pool closed");
}

/**
 * Read DATABASE_URL from environment. Returns undefined if not set.
 */
export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}
