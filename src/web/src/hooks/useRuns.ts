import { useEffect, useRef, useState } from "react";
import { ApiError, fetchRuns } from "../api";
import type { Run } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useRuns(entityType: string, entityId: string | undefined) {
  const [entries, setEntries] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const entityIdRef = useRef(entityId);
  entityIdRef.current = entityId;

  async function load() {
    const id = entityIdRef.current;
    if (!id) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const body = await fetchRuns({ entity_type: entityType, entity_id: id });
      if (entityIdRef.current === id) {
        setEntries(body.data);
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }

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
  }, [entityType, entityId, subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  return { entries, loading, refetch: load };
}
