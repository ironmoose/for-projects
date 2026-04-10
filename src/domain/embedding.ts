/**
 * Ollama embedding client — generates vector(768) embeddings via nomic-embed-text.
 *
 * Uses asymmetric retrieval prefixes per nomic-embed-text docs:
 *   - "search_document: " for content being stored
 *   - "search_query: " for search queries
 */

export interface EmbeddingService {
  /** Generate an embedding for content being stored. */
  embedDocument(text: string): Promise<number[] | null>;
  /** Generate an embedding for a search query. */
  embedQuery(text: string): Promise<number[] | null>;
  /** Check if the embedding service is available. */
  healthCheck(): Promise<boolean>;
}

export interface OllamaOptions {
  host: string;
  model?: string;
  timeoutMs?: number;
}

interface OllamaEmbeddingResponse {
  embedding?: number[];
  embeddings?: number[][];
}

export function getOllamaHost(): string {
  return process.env.OLLAMA_HOST ?? "http://localhost:11435";
}

export function createEmbeddingService(options?: Partial<OllamaOptions>): EmbeddingService {
  const host = options?.host ?? getOllamaHost();
  const model = options?.model ?? "nomic-embed-text";
  const timeoutMs = options?.timeoutMs ?? 30_000;

  async function embed(text: string): Promise<number[] | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // Try /api/embed first (newer Ollama), fall back to /api/embeddings (legacy)
      let response = await fetch(`${host}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: text }),
        signal: controller.signal,
      });

      if (response.status === 404) {
        response = await fetch(`${host}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: text }),
          signal: controller.signal,
        });
      }

      clearTimeout(timer);

      if (!response.ok) {
        console.error(`[embedding] Ollama returned ${response.status}: ${await response.text()}`);
        return null;
      }

      const data = (await response.json()) as OllamaEmbeddingResponse;
      // /api/embed returns { embeddings: [[...]] }, /api/embeddings returns { embedding: [...] }
      const vec = data.embeddings?.[0] ?? data.embedding;
      if (!Array.isArray(vec) || vec.length === 0) {
        console.error("[embedding] Ollama returned empty embedding");
        return null;
      }

      return vec;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.error(`[embedding] Ollama timed out after ${timeoutMs}ms`);
      } else {
        console.error("[embedding] Ollama request failed:", (err as Error).message);
      }
      return null;
    }
  }

  return {
    async embedDocument(text: string): Promise<number[] | null> {
      if (!text.trim()) return null;
      return embed(`search_document: ${text}`);
    },

    async embedQuery(text: string): Promise<number[] | null> {
      if (!text.trim()) return null;
      return embed(`search_query: ${text}`);
    },

    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${host}/api/tags`, {
          signal: AbortSignal.timeout(5000),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Build the text to embed for a given entity.
 *
 * For retrieval quality, we embed the "finding" surface — title + summary
 * + short structured fields — NOT full content blobs. Content is what you
 * read after you've found the right document, not what you search by.
 */
/** Max characters of content to use as a summary fallback for embedding. */
const CONTENT_FALLBACK_LIMIT = 500;

/**
 * Max characters of context/acceptance_criteria to include in embedding text.
 * nomic-embed-text has an 8192-token context window (~32K chars). We cap these
 * fields so that title + summary + context + AC fit comfortably within that limit.
 */
const EMBEDDING_FIELD_LIMIT = 2000;

export function buildEmbeddingText(entity: {
  title?: string;
  summary?: string | null;
  content?: string | null;
  context?: string | null;
  acceptance_criteria?: string | null;
  requirements?: string | null;
}): string {
  const parts: string[] = [];
  if (entity.title) parts.push(entity.title);
  if (entity.summary) {
    parts.push(entity.summary);
  } else if (entity.content) {
    parts.push(entity.content.slice(0, CONTENT_FALLBACK_LIMIT));
  }
  if (entity.context) parts.push(entity.context.slice(0, EMBEDDING_FIELD_LIMIT));
  if (entity.acceptance_criteria) parts.push(entity.acceptance_criteria.slice(0, EMBEDDING_FIELD_LIMIT));
  if (entity.requirements) parts.push(entity.requirements.slice(0, EMBEDDING_FIELD_LIMIT));
  return parts.join("\n\n");
}
