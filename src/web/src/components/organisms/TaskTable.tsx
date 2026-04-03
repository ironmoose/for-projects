import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../atoms/Badge";
import { IconButton } from "../atoms/IconButton";
import { PresenceCharm } from "../molecules/PresenceCharm";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";
import type { TaskSummary } from "../../types";
import { TASK_STATUSES } from "../../types";
import type { TaskStatus } from "../../types";

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
  tasks: TaskSummary[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onDeleteTask: (task: TaskSummary) => void;
  onUpdateTaskStatus?: (taskId: string, status: TaskStatus) => void;
}

export function TaskTable({ tasks, selectedTaskId, onSelectTask, onDeleteTask, onUpdateTaskStatus }: TaskTableProps) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";
  const [statusDropdownTaskId, setStatusDropdownTaskId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!statusDropdownTaskId) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownTaskId(null);
      }
    }
    window.addEventListener("click", handleClickOutside, true);
    return () => window.removeEventListener("click", handleClickOutside, true);
  }, [statusDropdownTaskId]);

  const handleStatusSelect = useCallback(
    (taskId: string, currentStatus: string, newStatus: TaskStatus) => {
      setStatusDropdownTaskId(null);
      if (newStatus === currentStatus) return;
      onUpdateTaskStatus?.(taskId, newStatus);
    },
    [onUpdateTaskStatus],
  );

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: theme.radius.lg,
        border: `1px solid ${isSynth ? sg(20) : theme.color.border}`,
        background: theme.color.surface,
        ...(isSynth ? { boxShadow: `0 0 12px ${sg(7)}` } : {}),
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
                  color: isSynth ? "var(--synth-glow)" : theme.color.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: theme.font.letterSpacing.wide,
                  borderBottom: isSynth
                    ? `2px solid ${sg(27)}`
                    : `2px solid ${theme.color.border}`,
                  whiteSpace: "nowrap",
                  ...(isSynth ? { textShadow: `0 0 8px ${sg(27)}` } : {}),
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
                    <PresenceCharm active={task.has_plan} label="Plan" color={theme.color.success} />
                    <PresenceCharm active={task.has_description} label="Description" color={theme.color.info ?? theme.color.primary} />
                    <PresenceCharm active={task.has_implementation} label="Implementation" color={theme.color.tertiary} />
                    <PresenceCharm active={task.has_acceptance_criteria} label="Acceptance criteria" color={theme.color.warning ?? theme.color.secondary} />
                  </div>
                </div>
              </td>
              <td style={{ ...cellStyle(theme), position: "relative" }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusDropdownTaskId(
                      statusDropdownTaskId === task.id ? null : task.id,
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      setStatusDropdownTaskId(
                        statusDropdownTaskId === task.id ? null : task.id,
                      );
                    }
                  }}
                  style={{ display: "inline-block", cursor: "pointer" }}
                  aria-label="Change task status"
                  aria-haspopup="listbox"
                  aria-expanded={statusDropdownTaskId === task.id}
                >
                  <Badge variant={statusBadgeVariant(task.status)}>
                    {STATUS_LABELS[task.status] ?? task.status}
                  </Badge>
                </div>
                {statusDropdownTaskId === task.id && (
                  <div
                    ref={dropdownRef}
                    role="listbox"
                    aria-label="Status options"
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      zIndex: 100,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      padding: theme.spacing.sm,
                      background: theme.color.surfaceContainer,
                      border: `1px solid ${isSynth ? sg(27) : theme.color.border}`,
                      borderRadius: theme.radius.md,
                      boxShadow: isSynth
                        ? `0 0 12px ${sg(9)}`
                        : theme.shadow.md,
                      minWidth: 120,
                    }}
                  >
                    {TASK_STATUSES.map((s) => (
                      <div
                        key={s}
                        role="option"
                        aria-selected={s === task.status}
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusSelect(task.id, task.status, s);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            e.preventDefault();
                            handleStatusSelect(task.id, task.status, s);
                          }
                        }}
                        style={{
                          cursor: "pointer",
                          padding: "2px 4px",
                          borderRadius: theme.radius.sm,
                          background:
                            s === task.status
                              ? `${theme.color.primary}18`
                              : "transparent",
                          transition: "background 100ms",
                        }}
                      >
                        <Badge
                          variant={statusBadgeVariant(s)}
                          style={{
                            opacity: s === task.status ? 1 : 0.7,
                            outline:
                              s === task.status
                                ? `2px solid ${theme.color.primary}`
                                : "none",
                            outlineOffset: 1,
                          }}
                        >
                          {STATUS_LABELS[s] ?? s}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
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
