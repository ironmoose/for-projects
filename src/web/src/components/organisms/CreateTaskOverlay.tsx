import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Input } from "../atoms/Input";
import { Select } from "../atoms/Select";
import { CreateEntityOverlay } from "./CreateEntityOverlay";

interface CreateTaskOverlayProps {
  onCreated: (summary: string, context?: string, status?: string) => Promise<void>;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: "todo", label: "todo" },
  { value: "in_progress", label: "in progress" },
  { value: "done", label: "done" },
];

export function CreateTaskOverlay({ onCreated, onClose }: CreateTaskOverlayProps) {
  const { theme } = useTheme();
  const [summary, setSummary] = useState("");
  const [context, setContext] = useState("");
  const [status, setStatus] = useState("todo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <CreateEntityOverlay
      title="Create Task"
      onSubmit={handleSubmit}
      onClose={onClose}
      loading={loading}
      submitDisabled={!summary.trim()}
    >
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
    </CreateEntityOverlay>
  );
}
