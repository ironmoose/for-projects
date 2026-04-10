/**
 * One-time embedding backfill — generates embeddings for all entities that
 * have a NULL embedding column. Used after SQLite → Postgres migration.
 *
 * Runs asynchronously (fire-and-forget from bootstrap). Failures are logged,
 * never thrown, so a partial backfill doesn't crash the server.
 */
import type { Sql } from "postgres";
import type { EmbeddingService } from "./embedding";
import { buildEmbeddingText } from "./embedding";
import { updateEmbedding, type EmbeddableTable } from "./repositories/pg/embedding";

export async function backfillEmbeddings(
  sql: Sql,
  embeddingService: EmbeddingService,
): Promise<void> {
  console.log("[embedding-backfill] Starting backfill for migrated data…");

  const tables: EmbeddableTable[] = ["projects", "tasks", "documents"];
  let total = 0;

  for (const table of tables) {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT * FROM ${sql(table)} WHERE embedding IS NULL
    `;

    if (rows.length === 0) continue;

    let count = 0;
    for (const entity of rows) {
      try {
        const text = buildEmbeddingText({
          title: entity.title as string | undefined,
          summary: entity.summary as string | null | undefined,
          content: entity.content as string | null | undefined,
          context: entity.context as string | null | undefined,
          acceptance_criteria: entity.acceptance_criteria as string | null | undefined,
        });

        if (!text.trim()) continue;

        const embedding = await embeddingService.embedDocument(text);
        if (!embedding) continue;

        await updateEmbedding(sql, table, entity.id as string, embedding);
        count++;
      } catch (err) {
        console.error(`[embedding-backfill] Failed ${table}/${entity.id}:`, err);
      }
    }

    if (count > 0) {
      console.log(`[embedding-backfill]   ${table}: ${count}/${rows.length}`);
    }
    total += count;
  }

  console.log(`[embedding-backfill] Done — ${total} embeddings generated`);
}
