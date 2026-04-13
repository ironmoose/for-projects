import { useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { Button } from "../atoms/Button";
import { ModalShell } from "./ModalShell";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell onClose={onCancel} maxWidth={400} variant="danger" title={title}>
      <p
        style={{
          margin: 0,
          fontFamily: t.fontSans,
          fontSize: t.fontSizeSm,
          color: t.colorTextMuted,
        }}
      >
        {message}
      </p>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: t.spaceSm }}>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </ModalShell>
  );
}
