/**
 * Embedding pipeline — subscribes to domain events and generates embeddings
 * asynchronously after entity writes. Failures are logged, never thrown.
 *
 * Only active when both Postgres and Ollama are available.
 */
import type { Sql } from "postgres";
import type { EventBus, DomainEvent } from "./events";
import type { EmbeddingService } from "./embedding";
import { buildEmbeddingText } from "./embedding";
import { updateEmbedding, type EmbeddableTable } from "./repositories/pg/embedding";

export interface EmbeddingPipelineOptions {
  sql: Sql;
  eventBus: EventBus;
  embeddingService: EmbeddingService;
}

/**
 * Start the embedding pipeline. Returns an unsubscribe function.
 *
 * On every created/updated event for projects, tasks, or documents:
 * 1. Fetch the entity from Postgres
 * 2. Build embedding text from its fields
 * 3. Call Ollama to generate the embedding
 * 4. Store the vector in the embedding column
 *
 * All steps are fire-and-forget — the caller's request is long returned.
 */
export function startEmbeddingPipeline(options: EmbeddingPipelineOptions): () => void {
  const { sql, eventBus, embeddingService } = options;

  const EMBEDDABLE_TABLES: Set<string> = new Set(["project", "task", "document"]);

  // Map entity_type from events to table names
  const TABLE_MAP: Record<string, EmbeddableTable> = {
    project: "projects",
    task: "tasks",
    document: "documents",
  };

  function handleEvent(event: DomainEvent): void {
    if (event.type === "deleted") return;
    if (!EMBEDDABLE_TABLES.has(event.entity_type)) return;

    const table = TABLE_MAP[event.entity_type];
    if (!table) return;

    // Fire and forget — each ID processed independently
    for (const id of event.ids) {
      processEntity(table, id).catch((err) => {
        console.error(`[embedding-pipeline] Failed to process ${table}/${id}:`, err);
      });
    }
  }

  async function processEntity(table: EmbeddableTable, id: string): Promise<void> {
    // Fetch the entity
    const rows = await sql`SELECT * FROM ${sql(table)} WHERE id = ${id}`;
    if (rows.length === 0) return; // deleted between event and processing

    const entity = rows[0] as Record<string, unknown>;
    const text = buildEmbeddingText({
      title: entity.title as string | undefined,
      summary: entity.summary as string | null | undefined,
      content: entity.content as string | null | undefined,
      context: entity.context as string | null | undefined,
      acceptance_criteria: entity.acceptance_criteria as string | null | undefined,
    });

    if (!text.trim()) return; // nothing to embed

    const embedding = await embeddingService.embedDocument(text);
    if (!embedding) return; // Ollama unavailable — graceful degradation

    await updateEmbedding(sql, table, id, embedding);
  }

  return eventBus.subscribe(handleEvent);
}
