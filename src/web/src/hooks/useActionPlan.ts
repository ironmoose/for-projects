import { useEffect, useRef, useState } from "react";
import { fetchActionPlan, updateActionStatus, ApiError } from "../api";
import type { Action, ActionStatus } from "../types";
import { useEntitySubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

interface TierGroup {
  rank: number;
  actions: Action[];
}

export function useActionPlan(target: string) {
  const [plan, setPlan] = useState<TierGroup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToastContext();

  const targetRef = useRef(target);
  targetRef.current = target;

  const fetchRef = useRef<(() => void) | undefined>(undefined);

  async function fetchData() {
    try {
      const data = await fetchActionPlan(targetRef.current);
      setPlan(data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load action plan");
    } finally {
      setLoading(false);
    }
  }

  fetchRef.current = fetchData;

  const throttledFetch = useThrottledCallback(() => {
    fetchRef.current?.();
  }, 200);

  useEntitySubscription(["action"], throttledFetch);

  useEffect(() => {
    setPlan(null);
    setLoading(true);
    fetchData();
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStatus(id: string, status: ActionStatus) {
    try {
      await updateActionStatus(id, status);
      fetchRef.current?.();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update action status");
    }
  }

  return { plan, loading, updateStatus };
}
