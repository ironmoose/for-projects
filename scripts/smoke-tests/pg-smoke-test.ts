import { createPgClient, initPgSchema, pgHealthCheck, pgShutdown } from "../../src/domain/db/pg-connection";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = createPgClient({ databaseUrl });

const healthy = await pgHealthCheck(sql);
console.log("health check:", healthy);

await initPgSchema(sql);

// Verify tables exist
const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
console.log("tables:", tables.map((t) => t.tablename));

// Verify vector columns
const vectors = await sql`SELECT table_name, column_name, udt_name FROM information_schema.columns WHERE udt_name = 'vector' ORDER BY table_name`;
console.log("vector columns:", vectors.map((v) => `${v.table_name}.${v.column_name}`));

// Verify HNSW indexes
const indexes = await sql`SELECT indexname FROM pg_indexes WHERE indexdef LIKE '%hnsw%' ORDER BY indexname`;
console.log("hnsw indexes:", indexes.map((i) => i.indexname));

await pgShutdown(sql);
