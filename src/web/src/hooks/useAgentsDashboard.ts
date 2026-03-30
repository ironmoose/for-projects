import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAgents } from "../api";
import type { Agent } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useThrottledCallback } from "./useThrottledCallback";

export function useAgentsDashboard() {
  const [rows, setRows] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const { subscribeEvents } = useEventSubscription();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAgents({ limit: 200 });
      setRows(result.data);
      setTotal(result.total);
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current();
  }, 500);

  useEffect(() => {
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "agent" || event.entity_type === "run") {
        throttledLoad();
      }
    });
  }, [load, subscribeEvents, throttledLoad]);

  return { rows, total, loading, refetch: load };
}
