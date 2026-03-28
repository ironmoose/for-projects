import { Card } from "./Card";
import { Icon } from "../atoms/Icon";
import { useTheme } from "../theme/ThemeContext";
import type { Action } from "../../types";
import { formatDate } from "../../utils";

const AGENT_META: Record<string, { icon: string; label: string }> = {
  research: { icon: "search", label: "Research" },
  design: { icon: "palette", label: "Design" },
  implementation: { icon: "code", label: "Implementation" },
  review: { icon: "rate_review", label: "Review" },
};

interface ActionCardProps {
  action: Action;
  onClick?: () => void;
  isSelected?: boolean;
  compact?: boolean;
}

export function ActionCard({ action, onClick, isSelected, compact }: ActionCardProps) {
  const { theme } = useTheme();
  const meta = action.agent ? AGENT_META[action.agent] : undefined;

  return (
    <Card
      hover
      padding="md"
      style={{
        cursor: onClick ? "pointer" : undefined,
        borderColor: isSelected ? theme.color.primary : undefined,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.md }}>
        {/* Agent icon */}
        {meta ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: theme.radius.md,
              background: theme.color.surfaceContainerHigh,
              flexShrink: 0,
            }}
          >
            <Icon name={meta.icon} size={20} style={{ color: theme.color.textMuted }} />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: theme.radius.md,
              background: theme.color.surfaceContainerHigh,
              flexShrink: 0,
            }}
          >
            <Icon name="task_alt" size={20} style={{ color: theme.color.textFaint }} />
          </div>
        )}

        {/* Label + metadata */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: theme.font.size.sm,
              fontWeight: 500,
              color: theme.color.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {meta?.label ?? "Action"}
          </div>
          {!compact && (
            <div
              style={{
                fontSize: theme.font.size.xxs,
                color: theme.color.textFaint,
                marginTop: 2,
              }}
            >
              T{action.rank} · {formatDate(action.updated_at)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
