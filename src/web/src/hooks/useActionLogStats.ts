import { useEffect, useRef, useState, useCallback } from "react";
import { ApiError, fetchActionLogStats } from "../api";
import type { ActionLogStatsResponse } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useActionLogStats(days = 30) {
  const [data, setData] = useState<ActionLogStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const daysRef = useRef(days);
  daysRef.current = days;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = await fetchActionLogStats({ days: daysRef.current });
      setData(body);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load action log stats");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadRef = useRef(load);
  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current();
  }, 2000);

  useEffect(() => {
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "action_log") {
        throttledLoad();
      }
    });
  }, [days, subscribeEvents, throttledLoad, load]);

  return { stats: data, loading, refetch: load };
}
