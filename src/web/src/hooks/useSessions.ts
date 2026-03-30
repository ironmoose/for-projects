import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchSessions } from "../api";
import type { Session } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export interface SessionFilters {
  project_id: string;
}

const INITIAL_FILTERS: SessionFilters = {
  project_id: "",
};

const PAGE_SIZE = 20;

export function useSessions() {
  const [filters, setFilters] = useState<SessionFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  // Reset page when filters change
  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.project_id !== filters.project_id) setPage(1);
    prevFiltersRef.current = filters;
  }, [filters]);

  const offset = (page - 1) * PAGE_SIZE;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset,
      };
      if (filters.project_id) params.project_id = filters.project_id;

      const body = await fetchSessions(params);
      setEntries(body.data);
      setTotal(body.total);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [filters.project_id, offset, showToast]);

  const loadRef = useRef(load);
  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current();
  }, 200);

  useEffect(() => {
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "session") {
        throttledLoad();
      }
    });
  }, [load, subscribeEvents, throttledLoad]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }, []);

  const updateFilter = useCallback(<K extends keyof SessionFilters>(key: K, value: SessionFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    entries,
    total,
    loading,
    filters,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    setPage,
    updateFilter,
    clearFilters,
    refetch: load,
  };
}
