import { useEffect, useRef, useState } from "react";
import { ApiError, createDocuments, deleteDocuments, fetchDocuments, updateDocuments } from "../api";
import type { DocumentSummary } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

const PAGE_SIZE = 20;

export function useDocuments(filter?: { tag?: string; title?: string; favorite?: boolean; folder?: string }) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const filterRef = useRef(filter);
  filterRef.current = filter;
  const pageRef = useRef(page);
  pageRef.current = page;

  const loadRef = useRef<(() => void) | undefined>(undefined);

  async function load() {
    try {
      const body = await fetchDocuments({
        ...filterRef.current,
        limit: PAGE_SIZE,
        offset: (pageRef.current - 1) * PAGE_SIZE,
      });
      setDocuments(body.data);
      setTotal(body.total);
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
  }, [filter?.tag, filter?.title, filter?.favorite, filter?.folder]);

  useEffect(() => {
    setLoading(true);
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "document") throttledLoad();
    });
  }, [subscribeEvents, throttledLoad, page, filter?.tag, filter?.title, filter?.favorite, filter?.folder]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return { documents, loading, total, totalPages, page, setPage, create, update, remove };
}
