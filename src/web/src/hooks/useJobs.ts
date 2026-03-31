import { useEffect, useRef, useState } from "react";
import { ApiError, fetchAgents, fetchJobs } from "../api";
import type { Agent, Job } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

const PAGE_SIZE = 50;

export function useJobs(filter?: { agent_id?: string; status?: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [agents, setAgents] = useState<Map<string, Agent>>(new Map());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const loadRef = useRef<(() => void) | undefined>(undefined);

  async function load() {
    try {
      const [jobsBody, agentsBody] = await Promise.all([
        fetchJobs({
          ...filter,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        fetchAgents({ limit: 200 }),
      ]);
      setJobs(jobsBody.data);
      setTotal(jobsBody.total);
      const agentMap = new Map<string, Agent>();
      for (const a of agentsBody.data) agentMap.set(a.id, a);
      setAgents(agentMap);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load jobs");
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
      if (event.entity_type === "job" || event.entity_type === "agent") throttledLoad();
    });
  }, [subscribeEvents, throttledLoad, page, filter?.agent_id, filter?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return { jobs, agents, total, totalPages, page, setPage, loading };
}
