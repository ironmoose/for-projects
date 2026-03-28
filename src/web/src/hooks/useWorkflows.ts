import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../api";
import type { Workflow } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const fetchRef = useRef<(() => void) | undefined>(undefined);

  async function fetchWorkflows() {
    try {
      const res = await apiFetch("/api/workflows");
      const body = await res.json();
      setWorkflows(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }

  fetchRef.current = fetchWorkflows;

  const throttledFetch = useThrottledCallback(() => {
    fetchRef.current?.();
  }, 200);

  useEffect(() => {
    fetchWorkflows();
    return subscribeEvents((event) => {
      if (event.entity === "workflow") throttledFetch();
    });
  }, [subscribeEvents, throttledFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createWorkflow(goal: string) {
    await apiFetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
  }

  return { workflows, loading, createWorkflow };
}
