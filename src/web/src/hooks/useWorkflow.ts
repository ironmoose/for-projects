import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "../api";
import type { Workflow, Phase, Instruction } from "../types";
import { useEventSubscription } from "./useEventSubscription";
import { useToastContext } from "../components/ToastContext";
import { useThrottledCallback } from "./useThrottledCallback";

export function useWorkflow(id: string) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [instructionsByPhase, setInstructionsByPhase] = useState<Record<string, Instruction[]>>({});
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const { subscribeEvents } = useEventSubscription();
  const { showToast } = useToastContext();

  const idRef = useRef(id);
  idRef.current = id;

  async function fetchInstructionsForPhase(phaseId: string): Promise<Instruction[]> {
    try {
      const res = await apiFetch(
        `/api/workflows/${encodeURIComponent(idRef.current)}/phases/${encodeURIComponent(phaseId)}/instructions`,
      );
      const body = await res.json();
      return body.data;
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load instructions");
      return [];
    }
  }

  async function fetchPhases() {
    try {
      const res = await apiFetch(`/api/workflows/${encodeURIComponent(idRef.current)}/phases`);
      const body = await res.json();
      const fetchedPhases: Phase[] = body.data;
      setPhases(fetchedPhases);

      // Fetch instructions for each phase
      const instrMap: Record<string, Instruction[]> = {};
      await Promise.all(
        fetchedPhases.map(async (phase) => {
          instrMap[phase.id] = await fetchInstructionsForPhase(phase.id);
        }),
      );
      setInstructionsByPhase(instrMap);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load phases");
    }
  }

  async function fetchWorkflow() {
    try {
      const res = await apiFetch(`/api/workflows/${encodeURIComponent(idRef.current)}`);
      const wf: Workflow = await res.json();
      setWorkflow(wf);
      fetchPhases();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        showToast(err instanceof ApiError ? err.message : "Failed to load workflow");
      }
    } finally {
      setLoading(false);
    }
  }

  const fetchRef = useRef(fetchWorkflow);
  fetchRef.current = fetchWorkflow;

  const throttledFetch = useThrottledCallback(() => {
    fetchRef.current();
  }, 200);

  useEffect(() => {
    setNotFound(false);
    setWorkflow(null);
    setPhases([]);
    setInstructionsByPhase({});
    setLoading(true);
    fetchWorkflow();

    return subscribeEvents((event) => {
      if (
        event.entity === "workflow" ||
        event.entity === "phase" ||
        event.entity === "instruction" ||
        event.entity === "binding"
      ) {
        throttledFetch();
      }
    });
  }, [id, subscribeEvents, throttledFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addPhase(title: string) {
    await apiFetch(`/api/workflows/${encodeURIComponent(id)}/phases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async function deletePhase(phaseId: string) {
    try {
      await apiFetch(`/api/workflows/${encodeURIComponent(id)}/phases/${phaseId}`, { method: "DELETE" });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete phase");
    }
  }

  async function addInstruction(phaseId: string, prompt: string) {
    await apiFetch(
      `/api/workflows/${encodeURIComponent(id)}/phases/${encodeURIComponent(phaseId)}/instructions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      },
    );
  }

  async function deleteInstruction(phaseId: string, instructionId: string) {
    try {
      await apiFetch(
        `/api/workflows/${encodeURIComponent(id)}/phases/${encodeURIComponent(phaseId)}/instructions/${instructionId}`,
        { method: "DELETE" },
      );
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete instruction");
    }
  }

  return {
    workflow,
    phases,
    instructionsByPhase,
    notFound,
    loading,
    addPhase,
    deletePhase,
    addInstruction,
    deleteInstruction,
  };
}
