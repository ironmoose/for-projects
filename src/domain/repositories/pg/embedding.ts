import type { Sql } from "postgres";

/** Postgres table names that have an embedding column. */
export type EmbeddableTable = "projects" | "tasks" | "documents";

/**
 * Store an embedding vector for an entity.
 * Uses pgvector's vector type — pass the raw number array.
 */
export async function updateEmbedding(
  sql: Sql,
  table: EmbeddableTable,
  id: string,
  embedding: number[],
): Promise<void> {
  const vectorStr = `[${embedding.join(",")}]`;
  await sql`
    UPDATE ${sql(table)} SET embedding = ${vectorStr}::vector WHERE id = ${id}
  `;
}
