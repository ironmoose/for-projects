import { useEffect, useRef, useState } from "react";
import { ApiError, fetchTasks } from "../api";
import type { TaskSummary } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

const PAGE_SIZE = 25;

export interface TaskFilter {
  status?: string;
  effort?: string;
  impact?: string;
  category?: string;
  group_key?: string;
  title?: string;
}

const STATUS_PRIORITY: Record<string, number> = {
  in_progress: 0,
  todo: 1,
  done: 2,
  archived: 3,
};

export function useProjectTasks(projectId: string, filter?: TaskFilter) {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const loadRef = useRef<(() => void) | undefined>(undefined);
  const prevFilterRef = useRef<string>("");

  // Reset page to 1 when filters change
  const filterKey = JSON.stringify(filter ?? {});
  useEffect(() => {
    if (prevFilterRef.current && prevFilterRef.current !== filterKey) {
      setPage(1);
    }
    prevFilterRef.current = filterKey;
  }, [filterKey]);

  async function load() {
    try {
      const body = await fetchTasks({
        project_id: projectId,
        ...filter,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      const sorted = body.data.sort((a, b) => {
        const pa = STATUS_PRIORITY[a.status] ?? 99;
        const pb = STATUS_PRIORITY[b.status] ?? 99;
        return pa - pb;
      });
      setTasks(sorted);
      setTotal(body.total);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current?.();
  }, 200);

  useEffect(() => {
    setLoading(true);
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "task") throttledLoad();
    });
  }, [subscribeEvents, throttledLoad, page, projectId, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return { tasks, total, totalPages, page, setPage, loading };
}
