import { useCallback, useEffect, useRef, useState } from "react";
import { useInjectStyles } from "@4lt7ab/ui/core";
import { Badge } from "../atoms/Badge";
import { IconButton } from "../atoms/IconButton";

import { tableWrapperStyle, tableHeaderStyle, cellStyle } from "../molecules/tableUtils";
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

const COLUMN_COUNT = 6; // Title, Status, Category, Effort, Impact, Actions

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

  useInjectStyles("tfp-task-row", `
    .tfp-task-row:hover {
      background: var(--color-surface-raised) !important;
    }
    .tfp-task-row:focus-visible {
      outline: 2px solid var(--focus-ring-color);
      outline-offset: -2px;
    }
  `);
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

  function renderTaskRow(task: TaskSummary): React.ReactNode {
    return (
      <tr
        key={task.id}
        className="tfp-task-row"
        onClick={() => onSelectTask(task.id)}
        style={{
          cursor: "pointer",
          background: selectedTaskId === task.id ? theme.color.surfaceContainerHigh : undefined,
          transition: "background 0.1s",
        }}
      >
        <td style={{ ...cellStyle(theme), fontWeight: 500, maxWidth: 320 }}>
          <span
            style={{
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {task.title}
          </span>
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
        <td style={{ ...cellStyle(theme), width: 32 }}>
          <IconButton
            icon="delete"
            size={14}
            onClick={(e) => { e.stopPropagation(); onDeleteTask(task); }}
            aria-label="Delete task"
          />
        </td>
      </tr>
    );
  }

  function renderGroupHeaderRow(groupKey: string, colSpan: number): React.ReactNode {
    return (
      <tr key={`group-header-${groupKey}`} style={{ cursor: "default" }}>
        <td
          colSpan={colSpan}
          style={{
            padding: `${theme.spacing.xs} ${theme.spacing.md}`,
            background: theme.color.surfaceContainer,
            borderBottom: `1px solid ${theme.color.border}`,
            fontSize: theme.font.size.xxs,
            fontWeight: 700,
            letterSpacing: theme.font.letterSpacing.wide,
            textTransform: "uppercase",
            color: isSynth ? "var(--synth-glow)" : theme.color.textFaint,
            maxWidth: 300,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            ...(isSynth ? { textShadow: `0 0 6px ${sg(20)}` } : {}),
          }}
        >
          {groupKey}
        </td>
      </tr>
    );
  }

  function renderGroupedRows(): React.ReactNode[] {
    // Determine if we need group headers at all
    const hasAnyGroup = tasks.some((t) => t.group_key !== null);
    if (!hasAnyGroup) {
      // No grouping — render flat list, identical to previous behavior
      return tasks.map((task) => renderTaskRow(task));
    }

    // Collect unique group keys in order (tasks are pre-sorted by group_key)
    const uniqueGroups: string[] = [];
    const seen = new Set<string>();
    for (const task of tasks) {
      const key = task.group_key ?? "__other__";
      if (!seen.has(key)) {
        seen.add(key);
        uniqueGroups.push(key);
      }
    }

    // Only one group and it's the "other" group — no headers needed
    if (uniqueGroups.length === 1 && uniqueGroups[0] === "__other__") {
      return tasks.map((task) => renderTaskRow(task));
    }

    const rows: React.ReactNode[] = [];
    let lastGroup: string | undefined;

    for (const task of tasks) {
      const currentGroup = task.group_key ?? "__other__";
      if (currentGroup !== lastGroup) {
        const label = currentGroup === "__other__" ? "Other" : currentGroup;
        rows.push(renderGroupHeaderRow(label, COLUMN_COUNT));
        lastGroup = currentGroup;
      }
      rows.push(renderTaskRow(task));
    }

    return rows;
  }

  return (
    <div
      style={tableWrapperStyle(theme, isSynth)}
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
            {["Title", "Status", "Category", "Effort", "Impact", ""].map((h) => (
              <th
                key={h || "_actions"}
                style={tableHeaderStyle(theme, isSynth)}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {renderGroupedRows()}
        </tbody>
      </table>
    </div>
  );
}
