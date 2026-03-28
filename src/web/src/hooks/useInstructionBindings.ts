import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../api";
import type { InstructionBinding } from "../types";
import { useToastContext } from "../components/ToastContext";

export function useInstructionBindings(
  workflowId: string,
  phaseId: string,
  instructionId: string,
) {
  const [bindings, setBindings] = useState<InstructionBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToastContext();

  const basePath = `/api/workflows/${encodeURIComponent(workflowId)}/phases/${encodeURIComponent(phaseId)}/instructions/${instructionId}/bindings`;

  async function fetchBindings() {
    try {
      const res = await apiFetch(basePath);
      const body = await res.json();
      setBindings(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load bindings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBindings();
  }, [instructionId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addBinding(arn: string) {
    await apiFetch(basePath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arn: arn.trim() }),
    });
    fetchBindings();
  }

  async function removeBinding(bindingId: string) {
    try {
      await apiFetch(`${basePath}/${bindingId}`, { method: "DELETE" });
      fetchBindings();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to remove binding");
    }
  }

  return { bindings, loading, addBinding, removeBinding };
}
