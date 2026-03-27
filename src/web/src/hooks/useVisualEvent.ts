import { useEffect, useRef } from "react";
import { useEventSubscription } from "./useEventSubscription";
import type { DomainEvent } from "../useRealtimeEvents";

/**
 * Subscribe to domain events for a specific entity type and optional entity ID.
 * Provides targeted event listening for per-component animations.
 */
export function useVisualEvent(
  entityType: DomainEvent["entity"],
  entityId: string | null,
  callback: (event: DomainEvent) => void,
): void {
  const { subscribeEvents } = useEventSubscription();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return subscribeEvents((event) => {
      if (event.entity !== entityType) return;
      if (entityId !== null && event.payload && (event.payload as Record<string, unknown>).id !== entityId) return;
      callbackRef.current(event);
    });
  }, [subscribeEvents, entityType, entityId]);
}
