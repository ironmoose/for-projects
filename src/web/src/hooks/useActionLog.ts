import { useEffect, useRef, useState } from "react";
import { ApiError, fetchActionLog } from "../api";
import type { ActionLogEntry } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useActionLog(entityType: string, entityId: string | undefined) {
  const [entries, setEntries] = useState<ActionLogEntry[]>([]);
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
      const body = await fetchActionLog({ entity_type: entityType, entity_id: id });
      if (entityIdRef.current === id) {
        setEntries(body.data);
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load action log");
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
      if (event.entity_type === "action_log") {
        throttledLoad();
      }
    });
  }, [entityType, entityId, subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  return { entries, loading, refetch: load };
}
