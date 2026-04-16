/**
 * TaskStatusSelect — inline status indicator with dropdown.
 *
 * Renders StatusDot + appearance:none <select> + optional blocked badge.
 * Used in task table rows and card headers across TasksPage and ProjectDetailPage.
 */

import { semantic as t } from "@4lt7ab/ui/core";
import { Badge, StatusDot } from "@4lt7ab/ui/ui";

import { STATUS_VARIANTS, STATUS_CSS_COLORS, STATUS_LABELS } from "../constants/task";
import { TASK_STATUSES } from "../types";
import type { TaskStatus } from "../types";

export interface TaskStatusSelectProps {
  status: TaskStatus;
  title: string;
  isBlocked?: boolean;
  onChange: (status: TaskStatus) => void;
}

export function TaskStatusSelect({
  status,
  title,
  isBlocked,
  onChange,
}: TaskStatusSelectProps) {
  const variant = STATUS_VARIANTS[status] ?? "muted";
  const selectColor = STATUS_CSS_COLORS[status] ?? t.colorTextMuted;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: t.spaceXs }}>
      <StatusDot
        variant={variant}
        size="sm"
        animate={status === "in_progress" ? "pulse" : "none"}
      />
      <select
        value={status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.value as TaskStatus);
        }}
        aria-label={`Status for ${title}`}
        style={{
          appearance: "none",
          border: "none",
          background: "transparent",
          color: selectColor,
          fontSize: "0.6rem",
          fontFamily: t.fontMono,
          fontWeight: 700,
          textTransform: "uppercase",
          cursor: "pointer",
          padding: 0,
          outline: "none",
          letterSpacing: "0.03em",
        }}
      >
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s] ?? s}
          </option>
        ))}
      </select>
      {isBlocked && <Badge variant="error">blocked</Badge>}
    </div>
  );
}
