import { useEffect, useRef, useState } from "react";
import { ApiError, fetchProject as apiFetchProject, createTasks, updateProjects, deleteTasks } from "../api";
import type { Project, DocumentSummary } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useProject(projectId: string) {
  const [project, setProject] = useState<(Project & { documents: DocumentSummary[] }) | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  async function loadProject() {
    try {
      const p = await apiFetchProject(projectIdRef.current);
      setProject(p);
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
    setLoading(true);
    loadProject();

    return subscribeEvents((event) => {
      if (event.entity_type === "project" || event.entity_type === "document") {
        throttledLoad();
      }
    });
  }, [projectId, subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateProject(input: { title?: string; goal?: string | null; requirements?: string | null; design?: string | null; attach_documents?: string[]; detach_documents?: string[] }) {
    if (!project) return;
    try {
      await updateProjects([{ id: project.id, ...input }]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update project");
    }
  }

  async function addTask(input: { title: string; description?: string; plan?: string; acceptance_criteria?: string; implementation?: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string }) {
    if (!project) return;
    await createTasks([{ project_id: project.id, ...input }]);
  }

  async function deleteTask(taskId: string) {
    await deleteTasks([taskId]);
  }

  return { project, notFound, loading, updateProject, addTask, deleteTask };
}
