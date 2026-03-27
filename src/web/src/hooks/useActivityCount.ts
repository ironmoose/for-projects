import { useCallback, useEffect, useRef, useState } from "react";
import { useEventSubscription } from "./useEventSubscription";

/**
 * Tracks recent event activity as a count that decays over time.
 * Increments on each event, decays by 1 every 3 seconds.
 * Resets to 0 when no events arrive for 10 seconds.
 */
export function useActivityCount(): number {
  const { subscribeEvents } = useEventSubscription();
  const [count, setCount] = useState(0);
  const lastEventTime = useRef(0);

  const handleEvent = useCallback(() => {
    lastEventTime.current = Date.now();
    setCount((c) => Math.min(c + 1, 100));
  }, []);

  useEffect(() => {
    return subscribeEvents(handleEvent);
  }, [subscribeEvents, handleEvent]);

  // Decay interval
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastEventTime.current;
      if (elapsed > 10000) {
        setCount(0);
      } else {
        setCount((c) => Math.max(0, c - 1));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return count;
}
