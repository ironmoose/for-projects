import { useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";
import { Select } from "../atoms/Select";
import { Overlay } from "../atoms/Overlay";

interface CreateTaskOverlayProps {
  onCreated: (summary: string, context?: string, status?: string) => Promise<void>;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export function CreateTaskOverlay({ onCreated, onClose }: CreateTaskOverlayProps) {
  const { theme } = useTheme();
  const [summary, setSummary] = useState("");
  const [context, setContext] = useState("");
  const [status, setStatus] = useState("todo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!summary.trim()) return;
    setLoading(true);
    setError(null);

    try {
      await onCreated(summary.trim(), context.trim() || undefined, status);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Overlay onClick={onClose} zIndex={200} style={{ background: "rgba(0,0,0,0.5)" }} />
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
            boxShadow: theme.shadow.lg,
            border: `1px solid ${theme.color.borderSubtle}`,
            width: "100%",
            maxWidth: 480,
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
          }}
        >
          {/* Header */}
          <h2
            style={{
              margin: 0,
              fontFamily: theme.font.body,
              fontSize: theme.font.size.lg,
              fontWeight: 600,
              color: theme.color.text,
            }}
          >
            Create Task
          </h2>

          {/* Summary input */}
          <Input
            label="Summary"
            id="task-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Task summary..."
          />

          {/* Context textarea */}
          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
            <label
              htmlFor="task-context"
              style={{
                fontSize: theme.font.size.xs,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: theme.color.textFaint,
                fontFamily: theme.font.body,
              }}
            >
              Context
            </label>
            <textarea
              id="task-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Additional context (optional)..."
              rows={4}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                border: `1px solid ${theme.color.borderSubtle}`,
                borderRadius: theme.radius.lg,
                fontFamily: theme.font.body,
                fontSize: theme.font.size.md,
                outline: "none",
                background: theme.color.surfaceContainerHigh,
                color: theme.color.text,
                transition: "border-color 0.15s",
                resize: "vertical",
              }}
            />
          </div>

          {/* Status select */}
          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
            <label
              htmlFor="task-status"
              style={{
                fontSize: theme.font.size.xs,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: theme.color.textFaint,
                fontFamily: theme.font.body,
              }}
            >
              Status
            </label>
            <Select
              id="task-status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <p
              style={{
                margin: 0,
                fontSize: theme.font.size.sm,
                color: theme.color.danger,
                fontFamily: theme.font.body,
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: theme.spacing.sm }}>
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={loading}
              disabled={!summary.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
