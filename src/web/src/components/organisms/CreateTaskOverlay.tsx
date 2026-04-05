import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Input } from "../atoms/Input";
import { Select } from "../atoms/Select";
import { CreateEntityOverlay } from "./CreateEntityOverlay";
import {
  TASK_STATUSES,
  EFFORT_LEVELS,
  IMPACT_LEVELS,
  TASK_CATEGORIES,
} from "../../types";

interface CreateTaskFields {
  title: string;
  summary?: string;
  group_key?: string;
  status?: string;
  effort?: string;
  impact?: string;
  category?: string;
}

interface CreateTaskOverlayProps {
  onCreated: (fields: CreateTaskFields) => Promise<void>;
  onClose: () => void;
}

function toSelectOptions(
  values: readonly string[],
  noneLabel = "-- none --",
): { value: string; label: string }[] {
  return [
    { value: "", label: noneLabel },
    ...values.map((v) => ({
      value: v,
      label: v.replace(/_/g, " "),
    })),
  ];
}

const STATUS_OPTIONS = TASK_STATUSES
  .filter((s) => s !== "archived")
  .map((v) => ({ value: v, label: v.replace(/_/g, " ") }));

const EFFORT_OPTIONS = toSelectOptions(EFFORT_LEVELS);
const IMPACT_OPTIONS = toSelectOptions(IMPACT_LEVELS);
const CATEGORY_OPTIONS = toSelectOptions(TASK_CATEGORIES);

export function CreateTaskOverlay({ onCreated, onClose }: CreateTaskOverlayProps) {
  const { theme } = useTheme();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [groupKey, setGroupKey] = useState("");
  const [status, setStatus] = useState("todo");
  const [effort, setEffort] = useState("");
  const [impact, setImpact] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    try {
      await onCreated({
        title: title.trim(),
        summary: summary.trim() || undefined,
        group_key: groupKey.trim() || undefined,
        status,
        effort: effort || undefined,
        impact: impact || undefined,
        category: category || undefined,
      });
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
      submitDisabled={!title.trim()}
    >
      <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: theme.spacing.lg, paddingRight: theme.spacing.xs }}>
        {/* Title (required) */}
        <Input
          label="Title"
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
        />

        {/* Summary */}
        <Input
          label="Summary"
          id="task-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Brief task summary (optional)"
        />

        {/* Group Key */}
        <Input
          label="Group Key"
          id="task-group-key"
          value={groupKey}
          onChange={(e) => setGroupKey(e.target.value)}
          placeholder="Group key (optional)"
        />

        {/* Row of selects */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing.md }}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
            <label
              htmlFor="task-effort"
              style={{
                fontSize: theme.font.size.xs,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: theme.color.textFaint,
                fontFamily: theme.font.body,
              }}
            >
              Effort
            </label>
            <Select
              id="task-effort"
              options={EFFORT_OPTIONS}
              value={effort}
              onChange={(e) => setEffort(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
            <label
              htmlFor="task-impact"
              style={{
                fontSize: theme.font.size.xs,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: theme.color.textFaint,
                fontFamily: theme.font.body,
              }}
            >
              Impact
            </label>
            <Select
              id="task-impact"
              options={IMPACT_OPTIONS}
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
            <label
              htmlFor="task-category"
              style={{
                fontSize: theme.font.size.xs,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase" as const,
                color: theme.color.textFaint,
                fontFamily: theme.font.body,
              }}
            >
              Category
            </label>
            <Select
              id="task-category"
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
        </div>
      </div>

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
