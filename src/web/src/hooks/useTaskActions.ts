import { useEffect, useRef, useState } from "react";
import { fetchActionsByTarget, ApiError } from "../api";
import type { Action } from "../types";
import { useEntitySubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useTaskActions(taskId: string) {
  const [actions, setActions] = useState<Action[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToastContext();

  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;

  const fetchRef = useRef<(() => void) | undefined>(undefined);

  async function fetchData() {
    try {
      const target = `tab:task:${taskIdRef.current}`;
      const body = await fetchActionsByTarget(target);
      setActions(body.data);
      setTotal(body.total ?? body.data.length);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load task actions");
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
    setActions([]);
    setTotal(0);
    setLoading(true);
    fetchData();
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { actions, loading, total };
}
