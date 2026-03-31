import { Badge } from "../atoms/Badge";
import { IconButton } from "../atoms/IconButton";
import { PresenceCharm } from "../molecules/PresenceCharm";
import { useTheme } from "../theme/ThemeContext";
import type { Task } from "../../types";

const STATUS_LABELS: Record<string, string> = {
  todo: "todo",
  in_progress: "in progress",
  done: "done",
  archived: "archived",
};

function statusBadgeVariant(status: string): "todo" | "in_progress" | "done" | "archived" | "default" {
  if (status === "todo" || status === "in_progress" || status === "done" || status === "archived") return status;
  return "default";
}

function cellStyle(theme: ReturnType<typeof useTheme>["theme"]): React.CSSProperties {
  return {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.color.border}`,
    verticalAlign: "middle",
  };
}

interface TaskTableProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onDeleteTask: (task: Task) => void;
}

export function TaskTable({ tasks, selectedTaskId, onSelectTask, onDeleteTask }: TaskTableProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.color.border}`,
        background: theme.color.surface,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: theme.font.size.sm,
          color: theme.color.text,
        }}
      >
        <thead>
          <tr>
            {["Title", "Status", "Category", "Effort", "Impact", "Group", ""].map((h) => (
              <th
                key={h || "_actions"}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  textAlign: "left",
                  fontWeight: 600,
                  fontSize: theme.font.size.xxs,
                  color: theme.color.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: theme.font.letterSpacing.wide,
                  borderBottom: `2px solid ${theme.color.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              style={{
                cursor: "pointer",
                background: selectedTaskId === task.id ? theme.color.surfaceContainerHigh : undefined,
                transition: "background 0.1s",
              }}
            >
              <td style={{ ...cellStyle(theme), fontWeight: 500, maxWidth: 320 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.title}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                    <PresenceCharm active={task.plan != null} label="Plan" color={theme.color.success} />
                    <PresenceCharm active={task.description != null} label="Description" color={theme.color.info ?? theme.color.primary} />
                    <PresenceCharm active={task.implementation != null} label="Implementation" color={theme.color.tertiary} />
                    <PresenceCharm active={task.acceptance_criteria != null} label="Acceptance criteria" color={theme.color.warning ?? theme.color.secondary} />
                  </div>
                </div>
              </td>
              <td style={cellStyle(theme)}>
                <Badge variant={statusBadgeVariant(task.status)}>
                  {STATUS_LABELS[task.status] ?? task.status}
                </Badge>
              </td>
              <td
                style={{
                  ...cellStyle(theme),
                  fontSize: theme.font.size.xs,
                  color: theme.color.textMuted,
                }}
              >
                {task.category ?? <span style={{ color: theme.color.textFaint }}>--</span>}
              </td>
              <td
                style={{
                  ...cellStyle(theme),
                  fontSize: theme.font.size.xs,
                  color: theme.color.textMuted,
                }}
              >
                {task.effort ?? <span style={{ color: theme.color.textFaint }}>--</span>}
              </td>
              <td
                style={{
                  ...cellStyle(theme),
                  fontSize: theme.font.size.xs,
                  color: theme.color.textMuted,
                }}
              >
                {task.impact ?? <span style={{ color: theme.color.textFaint }}>--</span>}
              </td>
              <td
                style={{
                  ...cellStyle(theme),
                  fontSize: theme.font.size.xs,
                  color: theme.color.textMuted,
                }}
              >
                {task.group_key ?? <span style={{ color: theme.color.textFaint }}>--</span>}
              </td>
              <td style={{ ...cellStyle(theme), width: 32 }}>
                <IconButton
                  icon="delete"
                  size={14}
                  onClick={(e) => { e.stopPropagation(); onDeleteTask(task); }}
                  aria-label="Delete task"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
