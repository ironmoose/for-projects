import { useCallback, useEffect, useRef, useState } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import { Badge, IconButton } from "@4lt7ab/ui/ui";

import { useTheme } from "../theme/ThemeContext";
import type { TaskSummary } from "../../types";
import { TASK_STATUSES } from "../../types";
import type { TaskStatus } from "../../types";
import { statusBadgeVariant } from "../../utils";

// Local table style helpers using library tokens + glow passthrough
function localTableWrapperStyle(glow: { animated: boolean; borderLight: string; shadowMd: string }): React.CSSProperties {
  return {
    overflowX: "auto",
    borderRadius: t.radiusLg,
    border: `1px solid ${glow.animated ? glow.borderLight : t.colorBorder}`,
    background: t.colorSurface,
    ...(glow.animated ? { boxShadow: glow.shadowMd } : {}),
  };
}

function localTableHeaderStyle(glow: { animated: boolean; accentColor: string; borderMedium: string; textShadow: string }): React.CSSProperties {
  return {
    padding: `${t.spaceSm} ${t.spaceMd}`,
    textAlign: "left",
    fontWeight: 600,
    fontSize: "0.625rem",
    color: glow.animated ? glow.accentColor : t.colorTextMuted,
    textTransform: "uppercase",
    letterSpacing: t.letterSpacingWide,
    borderBottom: glow.animated
      ? `2px solid ${glow.borderMedium}`
      : `2px solid ${t.colorBorder}`,
    whiteSpace: "nowrap",
    ...(glow.animated ? { textShadow: glow.textShadow } : {}),
  };
}

function localCellStyle(): React.CSSProperties {
  return {
    padding: `${t.spaceSm} ${t.spaceMd}`,
    borderBottom: `1px solid ${t.colorBorder}`,
    verticalAlign: "middle",
  };
}

const STATUS_LABELS: Record<string, string> = {
  todo: "todo",
  in_progress: "in progress",
  done: "done",
  archived: "archived",
};


const COLUMN_COUNT = 6; // Title, Status, Category, Effort, Impact, Actions

interface TaskTableProps {
  tasks: TaskSummary[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onDeleteTask: (task: TaskSummary) => void;
  onUpdateTaskStatus?: (taskId: string, status: TaskStatus) => void;
}

export function TaskTable({ tasks, selectedTaskId, onSelectTask, onDeleteTask, onUpdateTaskStatus }: TaskTableProps) {
  const { theme } = useTheme();
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
        tabIndex={0}
        role="row"
        onClick={() => onSelectTask(task.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSelectTask(task.id);
          }
        }}
        style={{
          cursor: "pointer",
          background: selectedTaskId === task.id ? t.colorSurfaceRaised : undefined,
          transition: "background 0.1s",
        }}
      >
        <td style={{ ...localCellStyle(), fontWeight: 500, maxWidth: 320 }}>
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
        <td style={{ ...localCellStyle(), position: "relative" }}>
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
                padding: t.spaceSm,
                background: t.colorSurface,
                border: `1px solid ${theme.glow.animated ? theme.glow.borderMedium : t.colorBorder}`,
                borderRadius: t.radiusMd,
                boxShadow: theme.glow.animated ? theme.glow.shadowLg : t.shadowMd,
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
                    borderRadius: t.radiusSm,
                    background:
                      s === task.status
                        ? `color-mix(in srgb, ${t.colorActionPrimary} 9%, transparent)`
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
                          ? `2px solid ${t.colorActionPrimary}`
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
            ...localCellStyle(),
            fontSize: t.fontSizeXs,
            color: t.colorTextMuted,
          }}
        >
          {task.category ?? <span style={{ color: t.colorTextSecondary }}>--</span>}
        </td>
        <td
          style={{
            ...localCellStyle(),
            fontSize: t.fontSizeXs,
            color: t.colorTextMuted,
          }}
        >
          {task.effort ?? <span style={{ color: t.colorTextSecondary }}>--</span>}
        </td>
        <td
          style={{
            ...localCellStyle(),
            fontSize: t.fontSizeXs,
            color: t.colorTextMuted,
          }}
        >
          {task.impact ?? <span style={{ color: t.colorTextSecondary }}>--</span>}
        </td>
        <td style={{ ...localCellStyle(), width: 32 }}>
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
            padding: `${t.spaceXs} ${t.spaceMd}`,
            background: t.colorSurface,
            borderBottom: `1px solid ${t.colorBorder}`,
            fontSize: "0.625rem",
            fontWeight: 700,
            letterSpacing: t.letterSpacingWide,
            textTransform: "uppercase",
            color: theme.glow.animated ? theme.glow.accentColor : t.colorTextSecondary,
            maxWidth: 300,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            ...(theme.glow.animated ? { textShadow: theme.glow.textShadow } : {}),
          }}
        >
          {groupKey}
        </td>
      </tr>
    );
  }

  function renderGroupedRows(): React.ReactNode[] {
    // Determine if we need group headers at all
    const hasAnyGroup = tasks.some((tk) => tk.group_key !== null);
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
      style={localTableWrapperStyle(theme.glow)}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: t.fontSizeSm,
          color: t.colorText,
        }}
      >
        <thead>
          <tr>
            {["Title", "Status", "Category", "Effort", "Impact", ""].map((h) => (
              <th
                key={h || "_actions"}
                style={localTableHeaderStyle(theme.glow)}
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
