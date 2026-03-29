import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Badge } from "../atoms/Badge";
import { StatusDot } from "../atoms/StatusDot";
import type { Action, ActionStatus, EntityAction } from "../../types";
import { actionStatusLabel } from "../../types";

interface ActionSlotProps {
  label: string;
  action: Action | null;
  entityAction?: EntityAction | null;
  onCreateClick: () => void;
  onActionClick: (action: Action) => void;
}

const statusBadgeVariant: Record<ActionStatus, "todo" | "in_progress" | "complete" | "failed"> = {
  todo: "todo",
  in_progress: "in_progress",
  complete: "complete",
  failed: "failed",
};

export function ActionSlot({ label, action, entityAction, onCreateClick, onActionClick }: ActionSlotProps) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);

  if (action === null) {
    return (
      <button
        type="button"
        onClick={onCreateClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.xs,
          width: "100%",
          minHeight: 80,
          padding: theme.spacing.md,
          border: hovered
            ? `1px solid ${theme.color.border}`
            : `1px dashed ${theme.color.borderSubtle}`,
          borderRadius: theme.radius.xl,
          background: hovered ? theme.color.surfaceContainerLow : "transparent",
          cursor: "pointer",
          transition: "background 0.15s, border 0.15s",
          fontFamily: theme.font.body,
        }}
      >
        <span
          style={{
            fontSize: theme.font.size.lg,
            color: theme.color.textFaint,
            lineHeight: 1,
          }}
        >
          +
        </span>
        <span
          style={{
            fontSize: theme.font.size.xxs,
            color: theme.color.textFaint,
            fontWeight: 500,
            letterSpacing: theme.font.letterSpacing.wide,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </button>
    );
  }

  const firstLine = action.prompt.split("\n")[0].slice(0, 120);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onActionClick(action)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActionClick(action);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        padding: theme.spacing.md,
        borderRadius: theme.radius.xl,
        background: theme.color.surfaceContainer,
        border: `1px solid ${theme.color.borderSubtle}`,
        boxShadow: hovered ? theme.shadow.md : "none",
        borderColor: hovered ? theme.color.border : theme.color.borderSubtle,
        cursor: "pointer",
        transition: "background 0.15s, box-shadow 0.15s, border-color 0.15s",
      }}
    >
      {/* Label heading */}
      <div
        style={{
          fontSize: theme.font.size.xxs,
          fontWeight: 700,
          color: theme.color.textFaint,
          letterSpacing: theme.font.letterSpacing.wide,
          textTransform: "uppercase",
          marginBottom: theme.spacing.sm,
        }}
      >
        {label}
      </div>

      {/* Status + agent row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.sm,
          flexWrap: "wrap",
        }}
      >
        {entityAction && (
          <Badge variant={statusBadgeVariant[entityAction.status]}>
            {actionStatusLabel[entityAction.status]}
          </Badge>
        )}
        {action.agent && (
          <span
            style={{
              fontSize: theme.font.size.xxs,
              color: theme.color.textMuted,
              fontWeight: 500,
            }}
          >
            {action.agent}
          </span>
        )}
        {entityAction?.output && (
          <StatusDot
            color={theme.color.success}
            size={6}
            style={{ marginLeft: "auto" }}
          />
        )}
      </div>

      {/* Prompt preview */}
      <div
        style={{
          marginTop: theme.spacing.sm,
          fontSize: theme.font.size.xs,
          color: theme.color.textMuted,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {firstLine}
      </div>
    </div>
  );
}
