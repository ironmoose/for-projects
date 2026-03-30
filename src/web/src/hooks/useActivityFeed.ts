import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRuns } from "../api";
import type { Run } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useThrottledCallback } from "./useThrottledCallback";

const STORAGE_KEY = "tab-activity-timeframe";
const DEFAULT_MINUTES = 60;

function readStoredMinutes(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    // ignore
  }
  return DEFAULT_MINUTES;
}

export function useActivityFeed() {
  const [running, setRunning] = useState<Run[]>([]);
  const [recent, setRecent] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeframeMinutes, setTimeframeMinutesState] = useState(readStoredMinutes);
  const { subscribeEvents } = useEventSubscription();

  const timeframeRef = useRef(timeframeMinutes);
  timeframeRef.current = timeframeMinutes;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sinceISO = new Date(Date.now() - timeframeRef.current * 60_000).toISOString();
      const [runningResult, recentResult] = await Promise.all([
        fetchRuns({ status: "running", limit: 50 }),
        fetchRuns({ finished_after: sinceISO, limit: 50 }),
      ]);
      setRunning(runningResult.data);
      setRecent(recentResult.data);
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current();
  }, 500);

  useEffect(() => {
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "run") {
        throttledLoad();
      }
    });
  }, [load, subscribeEvents, throttledLoad]);

  // Re-fetch when timeframe changes
  useEffect(() => {
    load();
  }, [timeframeMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  function setTimeframeMinutes(minutes: number) {
    setTimeframeMinutesState(minutes);
    try {
      localStorage.setItem(STORAGE_KEY, String(minutes));
    } catch {
      // ignore
    }
  }

  return { running, recent, loading, timeframeMinutes, setTimeframeMinutes, refetch: load };
}
