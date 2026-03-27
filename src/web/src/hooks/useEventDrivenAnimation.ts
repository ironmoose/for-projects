import { useCallback, useRef, useState } from "react";
import { useVisualEvent } from "./useVisualEvent";
import type { DomainEvent } from "../useRealtimeEvents";

type AnimationState = "idle" | "flash" | "glow" | "shake";

interface EventDrivenAnimationResult {
  animationState: AnimationState;
  lastEvent: DomainEvent | null;
}

/**
 * Maps domain events to animation states for a specific entity.
 * Animation states auto-reset after their duration.
 */
export function useEventDrivenAnimation(
  entityType: DomainEvent["entity"],
  entityId: string | null,
): EventDrivenAnimationResult {
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [lastEvent, setLastEvent] = useState<DomainEvent | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEvent = useCallback((event: DomainEvent) => {
    setLastEvent(event);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    let state: AnimationState = "flash";
    let duration = 600;

    if (event.entity === "instruction" && event.action === "updated") {
      const payload = event.payload as Record<string, unknown>;
      const status = payload.status as string | undefined;
      if (status === "running") {
        state = "glow";
        // Glow persists -- reset after a long duration
        duration = 5000;
      } else if (status === "complete") {
        state = "flash";
        duration = 600;
      } else if (status === "failed") {
        state = "shake";
        duration = 400;
      }
    }

    setAnimationState(state);
    timeoutRef.current = setTimeout(() => {
      setAnimationState("idle");
    }, duration);
  }, []);

  useVisualEvent(entityType, entityId, handleEvent);

  return { animationState, lastEvent };
}
