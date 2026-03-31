import { useEffect, useRef, useState } from "react";
import { ApiError, createAgents, deleteAgents, fetchAgents, updateAgents } from "../api";
import type { Agent } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const loadRef = useRef<(() => void) | undefined>(undefined);

  async function load() {
    try {
      const body = await fetchAgents();
      setAgents(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load agents");
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
    return subscribeEvents((event) => {
      if (event.entity_type === "agent") throttledLoad();
    });
  }, [subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  async function create(input: { name: string; description?: string; platform_agent?: string; prompt?: string }) {
    await createAgents([input]);
  }

  async function update(id: string, input: { name?: string; description?: string | null; platform_agent?: string | null; prompt?: string | null }) {
    await updateAgents([{ id, ...input }]);
  }

  async function remove(ids: string[]) {
    await deleteAgents(ids);
  }

  return { agents, loading, create, update, remove };
}
