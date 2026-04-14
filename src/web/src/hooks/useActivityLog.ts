import { useEffect, useRef, useState } from "react";
import { ApiError, fetchActivityLog } from "../api";
import type { ActivityLog } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToast } from "@4lt7ab/ui/ui";
import { useThrottledCallback } from "./useThrottledCallback";

const PAGE_SIZE = 50;

export function useActivityLog(filter?: { entity_type?: string; entity_id?: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToast();

  const loadRef = useRef<(() => void) | undefined>(undefined);

  async function load() {
    try {
      const body = await fetchActivityLog({
        ...filter,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setLogs(body.data);
      setTotal(body.total);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load activity log");
    } finally {
      setLoading(false);
    }
  }

  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current?.();
  }, 200);

  useEffect(() => {
    load();
    return subscribeEvents(() => {
      throttledLoad();
    });
  }, [subscribeEvents, throttledLoad, page, filter?.entity_type, filter?.entity_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return { logs, total, totalPages, page, setPage, loading };
}
