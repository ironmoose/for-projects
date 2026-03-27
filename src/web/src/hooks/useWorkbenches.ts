import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../api";
import type { Workbench } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useWorkbenches() {
  const [workbenches, setWorkbenches] = useState<Workbench[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const fetchRef = useRef<(() => void) | undefined>(undefined);

  async function fetchWorkbenches() {
    try {
      const res = await apiFetch("/api/workbenches");
      const body = await res.json();
      setWorkbenches(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load workbenches");
    } finally {
      setLoading(false);
    }
  }

  fetchRef.current = fetchWorkbenches;

  const throttledFetch = useThrottledCallback(() => {
    fetchRef.current?.();
  }, 200);

  useEffect(() => {
    fetchWorkbenches();
    return subscribeEvents((event) => {
      if (event.entity === "workbench") throttledFetch();
    });
  }, [subscribeEvents, throttledFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createWorkbench(goal: string) {
    await apiFetch("/api/workbenches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
  }

  return { workbenches, loading, createWorkbench };
}
