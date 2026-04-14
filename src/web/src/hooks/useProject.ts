import { useEffect, useRef, useState } from "react";
import { ApiError, fetchProject as apiFetchProject, createTasks, updateTasks, updateProjects, deleteTasks } from "../api";
import type { DocumentsMergePatch, ProjectDetail } from "../api";
import type { Project } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToast } from "@4lt7ab/ui/ui";
import { useThrottledCallback } from "./useThrottledCallback";

export function useProject(projectId: string) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToast();

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
      if (event.entity_type === "project" || event.entity_type === "document" || event.entity_type === "document_reference") {
        throttledLoad();
      }
    });
  }, [projectId, subscribeEvents, throttledLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateProject(input: { title?: string; summary?: string | null; context?: string | null; requirements?: string | null; documents?: DocumentsMergePatch }) {
    if (!project) return;
    try {
      await updateProjects([{ id: project.id, ...input }]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update project");
    }
  }

  async function addTask(input: { title: string; summary?: string; context?: string; acceptance_criteria?: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string; documents?: DocumentsMergePatch }) {
    if (!project) return;
    await createTasks([{ project_id: project.id, ...input }]);
  }

  async function updateTask(taskId: string, input: Record<string, string | null | undefined>) {
    try {
      await updateTasks([{ id: taskId, ...input }]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update task");
      throw err;
    }
  }

  async function deleteTask(taskId: string) {
    await deleteTasks([taskId]);
  }

  return { project, notFound, loading, updateProject, addTask, updateTask, deleteTask };
}
