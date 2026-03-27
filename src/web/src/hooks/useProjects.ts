import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../api";
import type { Project } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const fetchProjectsRef = useRef<(() => void) | undefined>(undefined);

  async function fetchProjects() {
    try {
      const res = await apiFetch("/api/projects");
      const body = await res.json();
      setProjects(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  fetchProjectsRef.current = fetchProjects;

  const throttledFetch = useThrottledCallback(() => {
    fetchProjectsRef.current?.();
  }, 200);

  useEffect(() => {
    fetchProjects();
    return subscribeEvents((event) => {
      if (event.entity === "project") throttledFetch();
    });
  }, [subscribeEvents, throttledFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  async function createProject(name: string, description: string) {
    await apiFetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
  }

  return { projects, loading, createProject };
}
