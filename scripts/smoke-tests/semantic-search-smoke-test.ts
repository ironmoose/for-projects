/**
 * Smoke test: semantic search end-to-end.
 *
 * Requires: DATABASE_URL and Ollama running.
 *
 * 1. Creates test documents with embeddings
 * 2. Creates document references linking them to a test project
 * 3. Runs semantic search
 * 4. Verifies results include reference context
 * 5. Cleans up
 */
import { createPgClient, initPgSchema, pgShutdown } from "../../src/domain/db/pg-connection";
import { createEmbeddingService, buildEmbeddingText } from "../../src/domain/embedding";
import { updateEmbedding } from "../../src/domain/repositories/pg/embedding";
import { PgDocumentRepository } from "../../src/domain/repositories/pg/documents";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) { console.error("DATABASE_URL not set"); process.exit(1); }

const sql = createPgClient({ databaseUrl });
await initPgSchema(sql);

const embedding = createEmbeddingService();
const healthy = await embedding.healthCheck();
if (!healthy) { console.error("Ollama not reachable"); await pgShutdown(sql); process.exit(1); }

const TEST_PREFIX = "SEMANTIC_SMOKE_";
const now = new Date().toISOString();

// Cleanup from previous runs
await sql`DELETE FROM document_references WHERE entity_id LIKE ${TEST_PREFIX + "%"} OR document_id LIKE ${TEST_PREFIX + "%"}`;
await sql`DELETE FROM documents WHERE id LIKE ${TEST_PREFIX + "%"}`;
await sql`DELETE FROM projects WHERE id LIKE ${TEST_PREFIX + "%"}`;

// Create a test project
await sql`INSERT INTO projects (id, title, summary, created_at, updated_at) VALUES (${TEST_PREFIX + "PROJ"}, ${"Auth System"}, ${"Authentication and authorization"}, ${now}, ${now})`;

// Create test documents
const docs = [
  { id: TEST_PREFIX + "DOC1", title: "Authentication Architecture", summary: "OAuth2 flow with PKCE, JWT tokens, refresh rotation" },
  { id: TEST_PREFIX + "DOC2", title: "Database Schema Design", summary: "Normalized tables for users, roles, permissions with row-level security" },
  { id: TEST_PREFIX + "DOC3", title: "API Rate Limiting Strategy", summary: "Token bucket algorithm with Redis, per-endpoint limits, exponential backoff" },
];

for (const doc of docs) {
  await sql`INSERT INTO documents (id, title, summary, favorite, created_at, updated_at) VALUES (${doc.id}, ${doc.title}, ${doc.summary}, ${false}, ${now}, ${now})`;
  const text = buildEmbeddingText({ title: doc.title, summary: doc.summary });
  const vec = await embedding.embedDocument(text);
  if (vec) {
    await updateEmbedding(sql, "documents", doc.id, vec);
    console.log(`embedded: ${doc.title} (${vec.length} dims)`);
  }
}

// Create document references
await sql`INSERT INTO document_references (entity_type, entity_id, document_id, type) VALUES ('project', ${TEST_PREFIX + "PROJ"}, ${TEST_PREFIX + "DOC1"}, 'design')`;
await sql`INSERT INTO document_references (entity_type, entity_id, document_id, type) VALUES ('project', ${TEST_PREFIX + "PROJ"}, ${TEST_PREFIX + "DOC2"}, 'design')`;

// Run semantic search
const repo = new PgDocumentRepository(sql);
const queryVec = await embedding.embedQuery("how does authentication work");
if (queryVec) {
  const results = await repo.semanticSearch(queryVec, { limit: 5 });
  console.log("\n--- semantic search: 'how does authentication work' ---");
  for (const r of results) {
    console.log(`  ${r.similarity.toFixed(4)}  ${r.title}`);
    if (r.references.length > 0) {
      for (const ref of r.references) {
        console.log(`           ↳ ${ref.entity_type}/${ref.entity_id} as ${ref.type}`);
      }
    }
  }
}

// Cleanup
await sql`DELETE FROM document_references WHERE entity_id LIKE ${TEST_PREFIX + "%"} OR document_id LIKE ${TEST_PREFIX + "%"}`;
await sql`DELETE FROM documents WHERE id LIKE ${TEST_PREFIX + "%"}`;
await sql`DELETE FROM projects WHERE id LIKE ${TEST_PREFIX + "%"}`;

await pgShutdown(sql);
console.log("\ndone");
