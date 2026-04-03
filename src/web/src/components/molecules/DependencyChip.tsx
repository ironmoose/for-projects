import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
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

const STATUS_COLORS: Record<TaskStatus, (theme: ReturnType<typeof useTheme>["theme"]) => string> = {
  todo: (t) => t.color.textMuted,
  in_progress: (t) => t.color.tertiary,
  done: (t) => t.color.success,
  archived: (t) => t.color.textFaint,
};

export function DependencyChip({ taskTitle, taskStatus, onRemove, onClick }: DependencyChipProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";
  const [hovered, setHovered] = useState(false);

  const statusColor = STATUS_COLORS[taskStatus]?.(theme) ?? theme.color.textMuted;

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={taskTitle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: theme.font.size.xs,
        color: theme.color.text,
        background: hovered ? theme.color.surfaceContainerHighest : theme.color.surfaceContainerHigh,
        borderRadius: theme.radius.full,
        padding: "3px 8px",
        cursor: "pointer",
        transition: `background ${theme.motion.fast} ${theme.motion.easing}`,
        maxWidth: 220,
        ...(isSynth ? {
          border: `1px solid ${sg(20)}`,
          boxShadow: `0 0 4px ${sg(9)}`,
        } : {
          border: `1px solid ${theme.color.borderSubtle}`,
        }),
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
