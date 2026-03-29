import { useCallback, useEffect, useRef, useState } from "react";
import { fetchActionsDashboard } from "../api";
import type { EntityActionDashboardRow } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useThrottledCallback } from "./useThrottledCallback";

export function useActionsDashboard() {
  const [rows, setRows] = useState<EntityActionDashboardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const { subscribeEvents } = useEventSubscription();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchActionsDashboard({ limit: 200 });
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
      if (event.entity === "entity_action" || event.entity === "action") {
        throttledLoad();
      }
    });
  }, [load, subscribeEvents, throttledLoad]);

  return { rows, total, loading, refetch: load };
}
