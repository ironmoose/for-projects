import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../api";
import type { Workbench, Instruction } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useWorkbench(id: string) {
  const [workbench, setWorkbench] = useState<Workbench | null>(null);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const idRef = useRef(id);
  idRef.current = id;

  async function fetchInstructions() {
    try {
      const res = await apiFetch(`/api/workbenches/${encodeURIComponent(idRef.current)}/instructions`);
      const body = await res.json();
      setInstructions(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load instructions");
    }
  }

  async function fetchWorkbench() {
    try {
      const res = await apiFetch(`/api/workbenches/${encodeURIComponent(idRef.current)}`);
      const wb: Workbench = await res.json();
      setWorkbench(wb);
      fetchInstructions();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        showToast(err instanceof ApiError ? err.message : "Failed to load workbench");
      }
    } finally {
      setLoading(false);
    }
  }

  const fetchRef = useRef(fetchWorkbench);
  fetchRef.current = fetchWorkbench;

  const throttledFetch = useThrottledCallback(() => {
    fetchRef.current();
  }, 200);

  useEffect(() => {
    setNotFound(false);
    setWorkbench(null);
    setInstructions([]);
    setLoading(true);
    fetchWorkbench();

    return subscribeEvents((event) => {
      if (event.entity === "workbench" || event.entity === "instruction" || event.entity === "instruction_binding") {
        throttledFetch();
      }
    });
  }, [id, subscribeEvents, throttledFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addInstruction(prompt: string) {
    await apiFetch(`/api/workbenches/${encodeURIComponent(id)}/instructions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  }

  async function deleteInstruction(instructionId: string) {
    try {
      await apiFetch(`/api/workbenches/${encodeURIComponent(id)}/instructions/${instructionId}`, { method: "DELETE" });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete instruction");
    }
  }

  return { workbench, instructions, notFound, loading, addInstruction, deleteInstruction };
}
