import { useEffect, useRef, useState } from "react";
import { ApiError, fetchAutomation as apiFetchAutomation, updateAutomations, deleteAutomations } from "../api";
import type { Automation } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToast } from "@4lt7ab/ui/ui";
import { useThrottledCallback } from "./useThrottledCallback";

type AutomationWithTags = Automation & { tags: string[] };

export function useAutomation(automationId: string) {
  const [automation, setAutomation] = useState<AutomationWithTags | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToast();

  const automationIdRef = useRef(automationId);
  automationIdRef.current = automationId;

  async function loadAutomation() {
    try {
      const a = await apiFetchAutomation(automationIdRef.current);
      setAutomation(a);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        showToast(err instanceof ApiError ? err.message : "Failed to load automation");
      }
    } finally {
      setLoading(false);
    }
  }

  const loadRef = useRef(loadAutomation);
  loadRef.current = loadAutomation;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current();
  }, 200);

  useEffect(() => {
    setNotFound(false);
    setAutomation(null);
    setLoading(true);
    loadAutomation();

    return subscribeEvents((event) => {
      if (event.entity_type === "automation") {
        throttledLoad();
      }
    });
  }, [automationId, subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateAutomation(input: { title?: string; summary?: string | null; prompt?: string | null; agent?: string | null; category?: string | null; is_favorite?: boolean; tags?: string[] }): Promise<boolean> {
    if (!automation) return false;
    try {
      await updateAutomations([{ id: automation.id, ...input }]);
      return true;
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update automation");
      return false;
    }
  }

  async function removeAutomation() {
    if (!automation) return;
    await deleteAutomations([automation.id]);
  }

  return { automation, notFound, loading, updateAutomation, removeAutomation };
}
