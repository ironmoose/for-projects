import { useEffect, useRef, useState } from "react";
import { ApiError, createProjects, deleteProjects, fetchProjects, updateProjects } from "../api";
import type { ProjectSummary } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToast } from "@4lt7ab/ui/ui";
import { useThrottledCallback } from "./useThrottledCallback";

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToast();

  const loadRef = useRef<(() => void) | undefined>(undefined);

  async function load() {
    try {
      const body = await fetchProjects();
      setProjects(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  loadRef.current = load;

  const throttledLoad = useThrottledCallback(() => {
    loadRef.current?.();
  }, 200);

  useEffect(() => {
    load();
    return subscribeEvents((event) => {
      if (event.entity_type === "project") throttledLoad();
    });
  }, [subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  async function create(input: { title: string; summary?: string }) {
    await createProjects([input]);
  }

  async function update(id: string, input: { title?: string; summary?: string | null }) {
    await updateProjects([{ id, ...input }]);
  }

  async function remove(ids: string[]) {
    await deleteProjects(ids);
  }

  return { projects, loading, create, update, remove };
}
