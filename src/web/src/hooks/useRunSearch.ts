import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchRuns } from "../api";
import type { Run } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export interface RunFilters {
  status: string;
  entity_type: string;
  agent_identifier: string;
  search: string;
  started_after: string;
  started_before: string;
}

const INITIAL_FILTERS: RunFilters = {
  status: "",
  entity_type: "",
  agent_identifier: "",
  search: "",
  started_after: "",
  started_before: "",
};

const PAGE_SIZE = 20;

export function useRunSearch() {
  const [filters, setFilters] = useState<RunFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [filters.search]);

  // Reset page when filters change
  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed =
      prev.status !== filters.status ||
      prev.entity_type !== filters.entity_type ||
      prev.agent_identifier !== filters.agent_identifier ||
      prev.started_after !== filters.started_after ||
      prev.started_before !== filters.started_before;
    if (changed) setPage(1);
    prevFiltersRef.current = filters;
  }, [filters]);

  // Reset page on debounced search change
  const prevSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch) {
      setPage(1);
      prevSearchRef.current = debouncedSearch;
    }
  }, [debouncedSearch]);

  const offset = (page - 1) * PAGE_SIZE;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset,
      };
      if (filters.status) params.status = filters.status;
      if (filters.entity_type) params.entity_type = filters.entity_type;
      if (filters.agent_identifier) params.agent_identifier = filters.agent_identifier;
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.started_after) params.started_after = filters.started_after;
      if (filters.started_before) params.started_before = filters.started_before;

      const body = await fetchRuns(params);
      setEntries(body.data);
      setTotal(body.total);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.entity_type, filters.agent_identifier, filters.started_after, filters.started_before, debouncedSearch, offset, showToast]);

  const loadRef = useRef(load);
  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current();
  }, 200);

  useEffect(() => {
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "run") {
        throttledLoad();
      }
    });
  }, [load, subscribeEvents, throttledLoad]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  }, []);

  const updateFilter = useCallback(<K extends keyof RunFilters>(key: K, value: RunFilters[K]) => {
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
