import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEntityActions, fetchAction } from "../api";
import type { Action, ActionRole, EntityAction, EntityType } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useThrottledCallback } from "./useThrottledCallback";

export interface EntityActionEntry {
  entityAction: EntityAction;
  action: Action;
}

export type EntityActionsMap = Partial<Record<ActionRole, EntityActionEntry>>;

export function useEntityActions(entityType: EntityType, entityId: string | undefined) {
  const [actionsMap, setActionsMap] = useState<EntityActionsMap>({});
  const [loading, setLoading] = useState(false);
  const { subscribeEvents } = useEventSubscription();

  const entityIdRef = useRef(entityId);
  entityIdRef.current = entityId;

  const load = useCallback(async () => {
    const id = entityIdRef.current;
    if (!id) {
      setActionsMap({});
      return;
    }
    setLoading(true);
    try {
      const entityActions = await fetchEntityActions(entityType, id);
      const entries = await Promise.all(
        entityActions.map(async (ea) => {
          const action = await fetchAction(ea.action_id);
          return [ea.role, { entityAction: ea, action }] as const;
        }),
      );
      if (entityIdRef.current === id) {
        setActionsMap(Object.fromEntries(entries));
      }
    } catch {
      // ignore — entity may not have actions yet
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  const loadRef = useRef(load);
  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current();
  }, 200);

  useEffect(() => {
    load();
    return subscribeEvents((event) => {
      if (event.entity === "entity_action" || event.entity === "action") {
        throttledLoad();
      }
    });
  }, [entityType, entityId, load, subscribeEvents, throttledLoad]);

  return { actionsMap, loading, refetch: load };
}
