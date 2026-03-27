import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../api";
import type { InstructionBinding, BindingKind } from "../types";
import { useToastContext } from "../components/ToastContext";

export function useInstructionBindings(workbenchId: string, instructionId: string) {
  const [bindings, setBindings] = useState<InstructionBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToastContext();

  async function fetchBindings() {
    try {
      const res = await apiFetch(
        `/api/workbenches/${encodeURIComponent(workbenchId)}/instructions/${instructionId}/bindings`,
      );
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

  async function addBinding(arn: string, kind: BindingKind) {
    await apiFetch(
      `/api/workbenches/${encodeURIComponent(workbenchId)}/instructions/${instructionId}/bindings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arn: arn.trim(), kind }),
      },
    );
    fetchBindings();
  }

  async function removeBinding(bindingId: string) {
    try {
      await apiFetch(
        `/api/workbenches/${encodeURIComponent(workbenchId)}/instructions/${instructionId}/bindings/${bindingId}`,
        { method: "DELETE" },
      );
      fetchBindings();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to remove binding");
    }
  }

  return { bindings, loading, addBinding, removeBinding };
}
