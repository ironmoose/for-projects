import { useCallback, useRef, useState } from "react";
import { useVisualEvent } from "./useVisualEvent";
import { useReducedMotion } from "./useReducedMotion";
import type { DomainEvent } from "../useRealtimeEvents";

export type AnimationState = "idle" | "flash" | "glow" | "shake";

/**
 * Convenience hook that maps domain events to animation states.
 * Returns the current animation state and the last event received.
 */
export function useEventDrivenAnimation(
  entityType: string,
  entityId: string | null,
): {
  animationState: AnimationState;
  lastEvent: DomainEvent | null;
} {
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [lastEvent, setLastEvent] = useState<DomainEvent | null>(null);
  const reduced = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEvent = useCallback(
    (event: DomainEvent) => {
      setLastEvent(event);
      if (reduced) return;

      // Clear any pending timer
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      let state: AnimationState = "flash";
      let duration = 600;

      if (event.type === "updated") {
        state = "flash";
        duration = 400;
      }

      setAnimationState(state);
      timerRef.current = setTimeout(() => {
        setAnimationState("idle");
        timerRef.current = null;
      }, duration);
    },
    [reduced],
  );

  useVisualEvent(entityType, entityId, handleEvent);

  return { animationState, lastEvent };
}
