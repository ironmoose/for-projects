import { useEffect, useRef, useState } from "react";
import { ApiError, createAutomations, deleteAutomations, fetchAutomations, updateAutomations } from "../api";
import type { AutomationSummary } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToast } from "@4lt7ab/ui/ui";
import { useThrottledCallback } from "./useThrottledCallback";

const PAGE_SIZE = 20;

export function useAutomations(filter?: { title?: string; category?: string; is_favorite?: boolean; tag?: string }, options?: { pageSize?: number }) {
  const [automations, setAutomations] = useState<AutomationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToast();

  const filterRef = useRef(filter);
  filterRef.current = filter;
  const pageRef = useRef(page);
  pageRef.current = page;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const loadRef = useRef<(() => void) | undefined>(undefined);

  async function load() {
    try {
      const effectivePageSize = optionsRef.current?.pageSize ?? PAGE_SIZE;
      const { data, total: totalCount } = await fetchAutomations({
        ...filterRef.current,
        limit: effectivePageSize,
        offset: (pageRef.current - 1) * effectivePageSize,
      });
      setAutomations(data);
      setTotal(totalCount);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load automations");
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
  }, [filter?.title, filter?.category, filter?.is_favorite, filter?.tag, options?.pageSize]);

  useEffect(() => {
    setLoading(true);
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "automation") throttledLoad();
    });
  }, [subscribeEvents, throttledLoad, page, filter?.title, filter?.category, filter?.is_favorite, filter?.tag, options?.pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectivePageSize = options?.pageSize ?? PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));

  async function create(input: { title: string; summary?: string; prompt?: string; agent?: string; category?: string; is_favorite?: boolean; tags?: string[] }) {
    await createAutomations([input]);
  }

  async function update(id: string, input: { title?: string; summary?: string | null; prompt?: string | null; agent?: string | null; category?: string | null; is_favorite?: boolean; tags?: string[] }) {
    await updateAutomations([{ id, ...input }]);
  }

  async function remove(ids: string[]) {
    await deleteAutomations(ids);
  }

  return { automations, loading, total, totalPages, page, setPage, create, update, remove };
}
