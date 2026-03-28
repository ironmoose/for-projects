import { useEffect, useRef, useState } from "react";
import { fetchActionsDashboard, updateActionStatus, ApiError } from "../api";
import type { Action, ActionStatus } from "../types";
import { useEntitySubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

interface DashboardData {
  executable: Action[];
  inProgress: Action[];
  recentlyTerminal: Action[];
}

export function useActionsDashboard() {
  const [data, setData] = useState<DashboardData>({
    executable: [],
    inProgress: [],
    recentlyTerminal: [],
  });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToastContext();

  const fetchRef = useRef<(() => void) | undefined>(undefined);

  async function fetchData() {
    try {
      const body = await fetchActionsDashboard();
      setData(body);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load actions dashboard");
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
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStatus(id: string, status: ActionStatus) {
    try {
      await updateActionStatus(id, status);
      fetchRef.current?.();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update action status");
    }
  }

  return { data, loading, updateStatus };
}
