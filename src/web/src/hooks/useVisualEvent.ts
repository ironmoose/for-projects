import { useEffect, useRef } from "react";
import { useEventSubscription } from "./useEventSubscription";
import type { DomainEvent } from "../useRealtimeEvents";

/**
 * Subscribe to domain events for a specific entity type, optionally filtered by ID.
 * The callback receives the full DomainEvent for the component to inspect.
 */
export function useVisualEvent(
  entityType: string,
  entityId: string | null,
  callback: (event: DomainEvent) => void,
): void {
  const { subscribeEvents } = useEventSubscription();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return subscribeEvents((event) => {
      if (event.entity_type !== entityType) return;
      if (entityId != null && !event.ids.includes(entityId)) return;
      callbackRef.current(event);
    });
  }, [subscribeEvents, entityType, entityId]);
}
