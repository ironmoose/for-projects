import { useEffect, useRef, useState } from "react";

export interface DomainEvent {
  entity: "project" | "task" | "action" | "entity_action";
  action: "created" | "updated" | "deleted" | "status_changed" | "tier_complete" | "linked" | "unlinked";
  payload: Record<string, unknown>;
}

export function useRealtimeEvents(onEvent: (event: DomainEvent) => void): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let attempt = 0;
    let unmounted = false;

    function connect() {
      if (unmounted) return;
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${proto}//${location.host}/ws`);

      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
      };

      ws.onmessage = (e) => {
        try {
          const event: DomainEvent = JSON.parse(e.data);
          onEventRef.current(event);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (unmounted) return;
        const delay = Math.min(1000 * 2 ** attempt, 30000);
        attempt++;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  return { connected };
}
