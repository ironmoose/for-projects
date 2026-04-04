import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
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
  const { theme } = useTheme();
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
    <ModalShell onClose={onCancel} maxWidth={400} variant="danger">
      <h2
        style={{
          margin: 0,
          fontFamily: theme.font.body,
          fontSize: theme.font.size.lg,
          fontWeight: 600,
          color: theme.color.text,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: 0,
          fontFamily: theme.font.body,
          fontSize: theme.font.size.sm,
          color: theme.color.textMuted,
        }}
      >
        {message}
      </p>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.sm }}>
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
