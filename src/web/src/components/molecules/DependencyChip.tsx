import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import { useTheme } from "../theme/ThemeContext";
import { StatusDot } from "../atoms/StatusDot";
import { IconButton } from "../atoms/IconButton";
import type { TaskStatus } from "../../types";

export interface DependencyChipProps {
  taskId: string;
  taskTitle: string;
  taskStatus: TaskStatus;
  dependencyType: "blocks" | "relates_to";
  onRemove: () => void;
  onClick: () => void;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: t.colorTextMuted,
  in_progress: t.colorWarning,
  done: t.colorSuccess,
  archived: t.colorTextSecondary,
};

export function DependencyChip({ taskTitle, taskStatus, onRemove, onClick }: DependencyChipProps) {
  const { theme } = useTheme();

  useInjectStyles("tfp-dep-chip", `
    .tfp-dep-chip:hover {
      background: var(--color-surface-raised) !important;
    }
    .tfp-dep-chip:focus-visible {
      outline: 2px solid var(--focus-ring-color);
      outline-offset: 2px;
    }
  `);

  const statusColor = STATUS_COLORS[taskStatus] ?? t.colorTextMuted;

  return (
    <span
      className="tfp-dep-chip"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      title={taskTitle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: t.fontSizeXs,
        color: t.colorText,
        background: t.colorSurfaceRaised,
        borderRadius: t.radiusFull,
        padding: "3px 8px",
        cursor: "pointer",
        transition: "background 0.15s ease",
        maxWidth: 220,
        border: `1px solid ${theme.glow.animated ? theme.glow.borderMedium : `color-mix(in srgb, ${t.colorBorder} 50%, transparent)`}`,
        boxShadow: theme.glow.shadowSm,
      }}
    >
      <StatusDot color={statusColor} size={7} />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}
      >
        {taskTitle}
      </span>
      <IconButton
        icon="close"
        size={11}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label={`Remove dependency ${taskTitle}`}
        style={{ width: 16, height: 16, minWidth: 16, flexShrink: 0 }}
      />
    </span>
  );
}
