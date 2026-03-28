import { useTheme } from "../theme/ThemeContext";
import { Skeleton } from "../atoms/Skeleton";
import { Badge } from "../atoms/Badge";
import { ActionCard } from "../molecules/ActionCard";
import { useTaskActions } from "../../hooks";

interface TaskActionsSectionProps {
  taskId: string;
  style?: React.CSSProperties;
}

export function TaskActionsSection({ taskId, style }: TaskActionsSectionProps) {
  const { theme } = useTheme();
  const { actions, loading, total } = useTaskActions(taskId);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm, ...style }}>
        <Skeleton width="100%" height={48} />
        <Skeleton width="100%" height={48} />
      </div>
    );
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <div style={style}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.md,
        }}
      >
        <span
          style={{
            fontSize: theme.font.size.sm,
            fontWeight: 700,
            color: theme.color.text,
          }}
        >
          Actions
        </span>
        <Badge variant="default">{total}</Badge>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
        {actions.map((action) => (
          <ActionCard key={action.id} action={action} compact />
        ))}
      </div>
    </div>
  );
}
