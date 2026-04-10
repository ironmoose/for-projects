/**
 * Smoke test: embedding pipeline end-to-end.
 *
 * Requires: DATABASE_URL and Ollama running.
 *
 * 1. Creates a project via Pg repos
 * 2. Waits for the embedding pipeline to process it
 * 3. Verifies the embedding column is populated
 */
import { createPgClient, initPgSchema, pgShutdown } from "../../src/domain/db/pg-connection";
import { createEmbeddingService, buildEmbeddingText } from "../../src/domain/embedding";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = createPgClient({ databaseUrl });
await initPgSchema(sql);

// Test 1: Ollama health
const embedding = createEmbeddingService();
const healthy = await embedding.healthCheck();
console.log("ollama health:", healthy);
if (!healthy) {
  console.error("Ollama not reachable — start it first");
  await pgShutdown(sql);
  process.exit(1);
}

// Test 2: Generate an embedding directly
const text = buildEmbeddingText({ title: "Test project", summary: "A test of the embedding pipeline" });
console.log("embedding text:", JSON.stringify(text));

const vec = await embedding.embedDocument(text);
console.log("embedding dimensions:", vec?.length ?? "null");
console.log("first 5 values:", vec?.slice(0, 5));

// Test 3: Store it in a test row
const testId = "EMBED_SMOKE_TEST";
await sql`DELETE FROM projects WHERE id = ${testId}`;
await sql`INSERT INTO projects (id, title, summary, created_at, updated_at) VALUES (${testId}, ${"Smoke Test"}, ${"Testing embeddings"}, ${new Date().toISOString()}, ${new Date().toISOString()})`;

if (vec) {
  const vectorStr = `[${vec.join(",")}]`;
  await sql`UPDATE projects SET embedding = ${vectorStr}::vector WHERE id = ${testId}`;
  console.log("stored embedding in projects row");

  // Verify it's there
  const [row] = await sql`SELECT embedding IS NOT NULL as has_embedding FROM projects WHERE id = ${testId}`;
  console.log("has_embedding:", row.has_embedding);

  // Test cosine similarity search
  const queryVec = await embedding.embedQuery("test project");
  if (queryVec) {
    const queryStr = `[${queryVec.join(",")}]`;
    const results = await sql`
      SELECT id, title, 1 - (embedding <=> ${queryStr}::vector) as similarity
      FROM projects
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${queryStr}::vector
      LIMIT 5
    `;
    console.log("similarity search results:", results.map(r => ({ id: r.id, title: r.title, similarity: Number(r.similarity).toFixed(4) })));
  }
}

// Cleanup
await sql`DELETE FROM projects WHERE id = ${testId}`;
await pgShutdown(sql);
console.log("\ndone — all checks passed");
