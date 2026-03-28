import { useEffect, useRef, useState } from "react";
import { fetchActionPlan, updateActionStatus, ApiError } from "../api";
import type { Action, ActionStatus } from "../types";
import { useEntitySubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

interface TierWithMeta {
  rank: number;
  actions: Action[];
  complete: boolean;
  progress: { done: number; total: number };
}

export function useProjectActions(projectId: string) {
  const [tiers, setTiers] = useState<TierWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToastContext();

  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  const fetchRef = useRef<(() => void) | undefined>(undefined);

  async function fetchData() {
    try {
      const target = `tab:project:${projectIdRef.current}`;
      const plan: Array<{ rank: number; actions: Action[] }> = await fetchActionPlan(target);
      const computed = plan.map((tier) => ({
        rank: tier.rank,
        actions: tier.actions,
        complete: tier.actions.every((a) => a.status === "complete" || a.status === "failed"),
        progress: {
          done: tier.actions.filter((a) => a.status === "complete" || a.status === "failed").length,
          total: tier.actions.length,
        },
      }));
      setTiers(computed);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load project actions");
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
    setTiers([]);
    setLoading(true);
    fetchData();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStatus(id: string, status: ActionStatus) {
    try {
      await updateActionStatus(id, status);
      fetchRef.current?.();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update action status");
    }
  }

  return { tiers, loading, updateStatus };
}
