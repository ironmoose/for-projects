import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../api";
import type { Project, Task } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  async function fetchTasks(pid: string) {
    try {
      const res = await apiFetch(`/api/projects/${encodeURIComponent(pid)}/tasks`);
      const body = await res.json();
      setTasks(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load tasks");
    }
  }

  async function fetchProject() {
    try {
      const res = await apiFetch(`/api/projects/${encodeURIComponent(projectIdRef.current)}`);
      const p: Project = await res.json();
      setProject(p);
      fetchTasks(p.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        showToast(err instanceof ApiError ? err.message : "Failed to load project");
      }
    } finally {
      setLoading(false);
    }
  }

  const fetchProjectRef = useRef(fetchProject);
  fetchProjectRef.current = fetchProject;

  const throttledFetch = useThrottledCallback(() => {
    fetchProjectRef.current();
  }, 200);

  useEffect(() => {
    setNotFound(false);
    setProject(null);
    setTasks([]);
    setLoading(true);
    fetchProject();

    return subscribeEvents((event) => {
      if (event.entity === "project" || event.entity === "task" || event.entity === "entity_action") {
        throttledFetch();
      }
    });
  }, [projectId, subscribeEvents, throttledFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateProjectStatus(status: Project["status"]) {
    if (!project) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update project status");
    }
  }

  async function addTask(summary: string, context?: string, status?: string) {
    if (!project) return;
    await apiFetch(`/api/projects/${encodeURIComponent(project.id)}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, context, status }),
    });
  }

  async function updateTaskStatus(taskId: string, status: Task["status"]) {
    if (!project) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(project.id)}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update task");
    }
  }

  return { project, tasks, notFound, loading, updateProjectStatus, addTask, updateTaskStatus };
}
