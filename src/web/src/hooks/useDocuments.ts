import { useEffect, useRef, useState } from "react";
import { ApiError, createDocuments, deleteDocuments, fetchDocuments, searchDocuments, updateDocuments } from "../api";
import type { DocumentSummary, SemanticSearchResult } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

const PAGE_SIZE = 20;

/** Map a SemanticSearchResult to DocumentSummary so the table renders identically. */
function toDocumentSummary(r: SemanticSearchResult): DocumentSummary {
  return {
    id: r.document_id,
    title: r.title,
    summary: r.summary,
    folder: r.folder,
    has_content: r.has_content,
    favorite: r.favorite,
    tags: r.tags,
    linked_projects: r.linked_projects,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function useDocuments(filter?: { tag?: string; title?: string; favorite?: boolean; folder?: string; project_id?: string }, options?: { semanticSearch?: boolean }) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSemanticResults, setIsSemanticResults] = useState(false);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const filterRef = useRef(filter);
  filterRef.current = filter;
  const pageRef = useRef(page);
  pageRef.current = page;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const loadRef = useRef<(() => void) | undefined>(undefined);

  async function load() {
    try {
      const currentFilter = filterRef.current;
      const useSemanticSearch = optionsRef.current?.semanticSearch && currentFilter?.title?.trim();

      if (useSemanticSearch) {
        // Semantic search mode — query is the title filter text
        const results = await searchDocuments({
          q: currentFilter!.title!,
          tag: currentFilter?.tag,
          folder: currentFilter?.folder,
          favorite: currentFilter?.favorite || undefined,
          limit: PAGE_SIZE,
        });
        setDocuments(results.map(toDocumentSummary));
        setTotal(results.length);
        setIsSemanticResults(true);
      } else {
        // Standard list mode
        const { project_id, ...rest } = currentFilter ?? {};
        const body = await fetchDocuments({
          ...rest,
          ...(project_id ? { entity_type: "project", entity_id: project_id } : {}),
          limit: PAGE_SIZE,
          offset: (pageRef.current - 1) * PAGE_SIZE,
        });
        setDocuments(body.data);
        setTotal(body.total);
        setIsSemanticResults(false);
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current?.();
  }, 200);

  useEffect(() => {
    setPage(1);
  }, [filter?.tag, filter?.title, filter?.favorite, filter?.folder, filter?.project_id]);

  useEffect(() => {
    setLoading(true);
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "document") throttledLoad();
    });
  }, [subscribeEvents, throttledLoad, page, filter?.tag, filter?.title, filter?.favorite, filter?.folder, filter?.project_id, options?.semanticSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function create(input: { title: string; summary?: string; content?: string; tags?: string[]; favorite?: boolean; folder?: string | null }) {
    await createDocuments([input]);
  }

  async function update(id: string, input: { title?: string; summary?: string | null; content?: string | null; tags?: string[]; favorite?: boolean; folder?: string | null }) {
    await updateDocuments([{ id, ...input }]);
  }

  async function remove(ids: string[]) {
    await deleteDocuments(ids);
  }

  return { documents, loading, total, totalPages, page, setPage, create, update, remove, isSemanticResults };
}
