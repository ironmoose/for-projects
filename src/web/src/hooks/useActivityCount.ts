import { useCallback, useEffect, useRef, useState } from "react";
import { useEventSubscription } from "./useEventSubscription";

/**
 * Tracks recent WebSocket event activity.
 * Increments on each event, decays by 1 every 3 seconds.
 * Resets to 0 after 10 seconds of inactivity.
 */
export function useActivityCount(): number {
  const { subscribeEvents } = useEventSubscription();
  const [count, setCount] = useState(0);
  const lastEventTimeRef = useRef(0);
  const decayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set up decay interval
  useEffect(() => {
    decayTimerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastEventTimeRef.current;

      if (elapsed >= 10000) {
        // No events for 10 seconds, reset to 0
        setCount(0);
      } else {
        // Decay by 1
        setCount((prev) => Math.max(0, prev - 1));
      }
    }, 3000);

    return () => {
      if (decayTimerRef.current != null) {
        clearInterval(decayTimerRef.current);
      }
    };
  }, []);

  // Subscribe to all events
  const handleEvent = useCallback(() => {
    lastEventTimeRef.current = Date.now();
    setCount((prev) => Math.min(prev + 1, 100));
  }, []);

  useEffect(() => {
    return subscribeEvents(handleEvent);
  }, [subscribeEvents, handleEvent]);

  return count;
}
