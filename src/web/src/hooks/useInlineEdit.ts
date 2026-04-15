/**
 * useInlineEdit — state machine for click-to-edit text fields.
 *
 * Manages which field is being edited, the edit buffer, and save/cancel actions.
 * Used by TaskDetailModal in both ProjectDetailPage and TasksPage.
 */

import { useState, useCallback } from "react";

export interface InlineEditActions {
  /** Which field is currently being edited (null = none). */
  editField: string | null;
  /** Current edit buffer value. */
  editValue: string;
  /** Enter edit mode for a field with its current value. */
  startEdit: (field: string, currentValue: string) => void;
  /** Save the current edit buffer and exit edit mode. Trims whitespace; sends null for empty. */
  saveEdit: (field: string) => Promise<void>;
  /** Discard changes and exit edit mode. */
  cancelEdit: () => void;
  /** Update the edit buffer (for controlled textarea/input). */
  setEditValue: (value: string) => void;
}

/**
 * @param onSave Called with `{ [field]: trimmedValue }` when the user saves.
 *               Receives `null` for the value if the trimmed string is empty.
 */
export function useInlineEdit(
  onSave: (patch: Record<string, string | null>) => Promise<void>,
): InlineEditActions {
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = useCallback((field: string, currentValue: string) => {
    setEditField(field);
    setEditValue(currentValue);
  }, []);

  const saveEdit = useCallback(
    async (field: string) => {
      const trimmed = editValue.trim();
      await onSave({ [field]: trimmed || null });
      setEditField(null);
    },
    [editValue, onSave],
  );

  const cancelEdit = useCallback(() => {
    setEditField(null);
  }, []);

  return { editField, editValue, startEdit, saveEdit, cancelEdit, setEditValue };
}
