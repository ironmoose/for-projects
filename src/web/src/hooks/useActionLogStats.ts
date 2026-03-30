import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchActionLogStats } from "../api";
import type { ActionLogStats } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useActionLogStats() {
  const [stats, setStats] = useState<ActionLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchActionLogStats();
      setStats(data);
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
  }, 200);

  useEffect(() => {
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "action_log") {
        throttledLoad();
      }
    });
  }, [subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  return { stats, loading, refetch: load };
}
