import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchDependencyGraph } from "../api";
import type { DependencyEdge, DependencyGraphResponse } from "../api";
import type { TaskSummary } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export interface DependencyGraph {
  tasks: TaskSummary[];
  edges: DependencyEdge[];
  blockedTaskIds: string[];
}

export function useDependencyGraph(projectId: string, statusFilter?: string) {
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const loadRef = useRef<(() => void) | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const data: DependencyGraphResponse = await fetchDependencyGraph(projectId, statusFilter || undefined);
      setGraph({
        tasks: data.tasks,
        edges: data.edges,
        blockedTaskIds: data.blocked_task_ids,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Endpoint not yet available — show empty graph
        setGraph({ tasks: [], edges: [], blockedTaskIds: [] });
      } else {
        showToast(err instanceof ApiError ? err.message : "Failed to load dependency graph");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter, showToast]);

  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current?.();
  }, 200);

  useEffect(() => {
    setLoading(true);
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "task") throttledLoad();
    });
  }, [subscribeEvents, throttledLoad, projectId, load]);

  return { graph, loading };
}
