import { useEffect, useRef, useState } from "react";
import { fetchHealth } from "../api";

interface HealthState {
  semanticSearchAvailable: boolean;
  loading: boolean;
}

/** How often to retry when Postgres is the backend but Ollama isn't connected yet. */
const RETRY_INTERVAL_MS = 10_000;
const MAX_RETRIES = 18; // ~3 minutes of retrying

export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ semanticSearchAvailable: false, loading: true });
  const retriesRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function check() {
      try {
        const h = await fetchHealth();
        if (cancelled) return;

        const available = h.backend === "postgres" && h.ollama === "connected";
        setState({ semanticSearchAvailable: available, loading: false });

        // Postgres backend but Ollama not ready yet — keep trying
        if (h.backend === "postgres" && !available && retriesRef.current < MAX_RETRIES) {
          retriesRef.current++;
          timer = setTimeout(check, RETRY_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setState({ semanticSearchAvailable: false, loading: false });
      }
    }

    check();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return state;
}
