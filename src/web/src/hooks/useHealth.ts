import { useEffect, useState } from "react";
import { fetchHealth } from "../api";

interface HealthState {
  semanticSearchAvailable: boolean;
  loading: boolean;
}

export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ semanticSearchAvailable: false, loading: true });

  useEffect(() => {
    let cancelled = false;
    fetchHealth()
      .then((h) => {
        if (!cancelled) {
          setState({
            semanticSearchAvailable: h.backend === "postgres" && h.ollama === "connected",
            loading: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ semanticSearchAvailable: false, loading: false });
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}
