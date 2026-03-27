import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../api";
import type { Tag } from "../types";
import { useToastContext } from "../components/ToastContext";

export function useTaskTags(projectId: string, taskId: string) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToastContext();

  async function fetchTags() {
    try {
      const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/tasks/${taskId}/tags`);
      const body = await res.json();
      setTags(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load tags");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTags();
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addTag(name: string) {
    await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/tasks/${taskId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim().toLowerCase() }),
    });
    fetchTags();
  }

  async function removeTag(tagId: string) {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/tasks/${taskId}/tags/${tagId}`, { method: "DELETE" });
      fetchTags();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to remove tag");
    }
  }

  return { tags, loading, addTag, removeTag };
}
