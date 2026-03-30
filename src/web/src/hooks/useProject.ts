import { useEffect, useRef, useState } from "react";
import { ApiError, fetchProject as apiFetchProject, fetchTasks, createTasks, updateProjects } from "../api";
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

  async function loadTasks(pid: string) {
    try {
      const body = await fetchTasks({ project_id: pid });
      setTasks(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load tasks");
    }
  }

  async function loadProject() {
    try {
      const p = await apiFetchProject(projectIdRef.current);
      setProject(p);
      loadTasks(p.id);
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

  const loadProjectRef = useRef(loadProject);
  loadProjectRef.current = loadProject;

  const throttledLoad = useThrottledCallback(() => {
    loadProjectRef.current();
  }, 200);

  useEffect(() => {
    setNotFound(false);
    setProject(null);
    setTasks([]);
    setLoading(true);
    loadProject();

    return subscribeEvents((event) => {
      if (event.entity_type === "project" || event.entity_type === "task" || event.entity_type === "action_log") {
        throttledLoad();
      }
    });
  }, [projectId, subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateProject(input: { title?: string; goal?: string | null; requirements?: string | null; design?: string | null }) {
    if (!project) return;
    try {
      await updateProjects([{ id: project.id, ...input }]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update project");
    }
  }

  async function addTask(title: string) {
    if (!project) return;
    await createTasks([{ project_id: project.id, title }]);
  }

  return { project, tasks, notFound, loading, updateProject, addTask };
}
