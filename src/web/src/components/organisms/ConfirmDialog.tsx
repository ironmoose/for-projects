import { useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Button } from "../atoms/Button";
import { Overlay } from "../atoms/Overlay";
import { useShortcutSuppression } from "../../hooks/useKeyboardShortcuts";

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

  // Suppress keyboard shortcuts while dialog is open
  useShortcutSuppression();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Overlay onClick={onCancel} zIndex={200} style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 201,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: "auto",
            background: theme.color.surfaceContainer,
            borderRadius: theme.radius.lg,
            boxShadow: theme.glow.animated ? theme.glow.dangerShadow : theme.shadow.lg,
            border: `1px solid ${theme.glow.dangerBorder}`,
            width: "100%",
            maxWidth: 400,
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
          }}
        >
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
        </div>
      </div>
    </>
  );
}
