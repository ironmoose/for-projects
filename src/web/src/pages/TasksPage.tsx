/**
 * TasksPage — observability dashboard for cross-project task management.
 *
 * UI dependencies: @4lt7ab/ui only.
 * Data dependencies: hooks, api layer, types.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import {
  Button,
  Card,
  IconButton,
  Icon,
  Badge,
  StatusDot,
  Stack,
  SearchInput,
  Input,
  Select,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableEmptyRow,
  Pagination,
  ConfirmDialog,
  ModalShell,
  Skeleton,
  RowSkeleton,
  SegmentedControl,
  SectionLabel,
  MetadataTable,
  EmptyState,
  Grid,
  Divider,
  Surface,
  useToast,
} from "@4lt7ab/ui/ui";

import { useProjects } from "../hooks/useProjects";
import { useEventSubscription } from "../hooks/useEventSubscription";
import { useThrottledCallback } from "../hooks/useThrottledCallback";
import {
  ApiError,
  fetchTasks,
  fetchTask,
  updateTasks,
  deleteTasks,
} from "../api";
import type { TaskDetail } from "../api";
import { TASK_STATUSES, EFFORT_LEVELS, IMPACT_LEVELS, TASK_CATEGORIES } from "../types";
import type { TaskSummary, TaskStatus } from "../types";
import { PillSelect } from "../components/PillSelect";
import { formatRelativeDate, staggerStyle } from "../utils";
import { MetaPill } from "../components/MetaPill";
import { useInlineEdit } from "../hooks/useInlineEdit";
import { TextSection } from "../components/TextSection";
import { STATUS_COLORS, STATUS_LABELS, CATEGORY_ICONS } from "../constants/task";
import { PageShell } from "../components/PageShell";
import { TaskStatusSelect } from "../components/TaskStatusSelect";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLES_ID = "tasks-page-styles";
const STYLES_CSS = `
  .tp-card {
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .tp-card:hover {
    transform: translateY(-3px);
    border-color: ${t.colorBorderFocused};
    box-shadow: ${t.shadowMd};
  }
  .tp-card:hover .tp-card-title {
    color: ${t.colorActionPrimary};
  }
  @media (prefers-reduced-motion: reduce) {
    .tp-card { transition: none; }
  }
`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

// STATUS_COLORS, STATUS_LABELS, CATEGORY_ICONS imported from ../constants/task

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

interface TaskFilters {
  title?: string;
  status?: string;
  project_id?: string;
  effort?: string;
  impact?: string;
  category?: string;
  blocked?: string;
}

// ---------------------------------------------------------------------------
// Status distribution cards
// ---------------------------------------------------------------------------

function StatusDistribution({
  tasks,
  total,
}: {
  tasks: TaskSummary[];
  total: number;
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { todo: 0, in_progress: 0, done: 0, archived: 0 };
    for (const task of tasks) {
      if (task.status in c) c[task.status]++;
    }
    return c;
  }, [tasks]);

  const blockedCount = useMemo(() => tasks.filter((t) => t.is_blocked).length, [tasks]);

  return (
    <Grid minColumnWidth={140} gap="sm">
      {TASK_STATUSES.map((status) => {
        const count = counts[status] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <Card key={status} variant="flat" style={{ padding: t.spaceMd }}>
            <div style={{ display: "flex", alignItems: "center", gap: t.spaceXs, marginBottom: t.spaceXs }}>
              <StatusDot
                color={STATUS_COLORS[status]}
                size={8}
                animate={status === "in_progress" && count > 0 ? "pulse" : "none"}
              />
              <span style={{
                fontSize: t.fontSizeXs,
                fontFamily: t.fontMono,
                fontWeight: 600,
                color: t.colorTextMuted,
                textTransform: "uppercase",
                letterSpacing: t.letterSpacingWide,
              }}>
                {STATUS_LABELS[status]}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: t.spaceXs }}>
              <span style={{
                fontSize: t.fontSizeXl,
                fontWeight: 700,
                fontFamily: t.fontSerif,
                color: count > 0 ? t.colorText : t.colorTextMuted,
              }}>
                {count}
              </span>
              <span style={{
                fontSize: t.fontSizeXs,
                color: `color-mix(in srgb, ${t.colorTextMuted} 60%, transparent)`,
                fontFamily: t.fontMono,
              }}>
                {pct}%
              </span>
            </div>
          </Card>
        );
      })}

      {/* Blocked indicator card */}
      <Card variant="flat" style={{
        padding: t.spaceMd,
        borderLeft: blockedCount > 0 ? `3px solid ${t.colorError}` : undefined,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: t.spaceXs, marginBottom: t.spaceXs }}>
          <Icon name="block" size={12} style={{ color: blockedCount > 0 ? t.colorError : t.colorTextMuted }} />
          <span style={{
            fontSize: t.fontSizeXs,
            fontFamily: t.fontMono,
            fontWeight: 600,
            color: blockedCount > 0 ? t.colorError : t.colorTextMuted,
            textTransform: "uppercase",
            letterSpacing: t.letterSpacingWide,
          }}>
            Blocked
          </span>
        </div>
        <span style={{
          fontSize: t.fontSizeXl,
          fontWeight: 700,
          fontFamily: t.fontSerif,
          color: blockedCount > 0 ? t.colorError : t.colorTextMuted,
        }}>
          {blockedCount}
        </span>
      </Card>
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Category distribution chips
// ---------------------------------------------------------------------------

function CategoryDistribution({ tasks }: { tasks: TaskSummary[] }) {
  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const task of tasks) {
      if (task.category) {
        c[task.category] = (c[task.category] ?? 0) + 1;
      }
    }
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  if (categoryCounts.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: t.spaceXs, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{
        fontSize: t.fontSizeXs,
        fontFamily: t.fontMono,
        fontWeight: 600,
        color: t.colorTextMuted,
        textTransform: "uppercase",
        letterSpacing: t.letterSpacingWide,
        marginRight: t.spaceXs,
      }}>
        Categories
      </span>
      {categoryCounts.map(([cat, count]) => (
        <span key={cat} style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: `4px ${t.spaceMd}`,
          borderRadius: t.radiusFull,
          background: `color-mix(in srgb, ${t.colorBorder} 40%, transparent)`,
          fontSize: t.fontSizeXs,
          fontFamily: t.fontMono,
          fontWeight: 500,
          color: t.colorTextMuted,
        }}>
          <Icon name={CATEGORY_ICONS[cat] ?? "label"} size={11} style={{ color: t.colorTextMuted }} />
          {cat}
          <span style={{
            fontWeight: 700,
            color: t.colorTextSecondary,
            marginLeft: 2,
          }}>
            {count}
          </span>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard header
// ---------------------------------------------------------------------------

function DashboardHeader({
  total,
  search,
  onSearchChange,
}: {
  total: number;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: t.spaceMd,
      padding: `${t.spaceLg} 0 ${t.spaceSm}`,
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm, flex: "0 0 auto" }}>
        <Icon name="task_alt" size={24} style={{ color: t.colorActionPrimary }} />
        <h1 style={{
          margin: 0,
          fontSize: t.fontSizeXl,
          fontWeight: 700,
          fontFamily: t.fontSerif,
          color: t.colorText,
          letterSpacing: t.letterSpacingTight,
        }}>
          Tasks
        </h1>
        <span style={{
          fontSize: t.fontSizeSm,
          fontFamily: t.fontMono,
          color: t.colorTextMuted,
          fontWeight: 500,
        }}>
          {total}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 200, maxWidth: 400 }}>
        <SearchInput
          value={search}
          onSearch={onSearchChange}
          placeholder="Search tasks..."
          debounceMs={200}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

function FilterBar({
  filters,
  onChange,
  projects,
  activeCount,
  onClearAll,
  viewMode,
  onViewModeChange,
  blockedCount,
}: {
  filters: TaskFilters;
  onChange: (f: TaskFilters) => void;
  projects: { id: string; title: string }[];
  activeCount: number;
  onClearAll: () => void;
  viewMode: "list" | "cards";
  onViewModeChange: (v: "list" | "cards") => void;
  blockedCount: number;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: t.spaceSm,
      flexWrap: "wrap",
    }}>
      <SegmentedControl
        size="sm"
        segments={[
          { value: "list", label: "", icon: "view_list" },
          { value: "cards", label: "", icon: "grid_view" },
        ]}
        value={viewMode}
        onChange={(v) => onViewModeChange(v as "list" | "cards")}
      />

      <Divider orientation="vertical" length={20} />

      <PillSelect
        value={filters.status ?? ""}
        options={[
          { value: "", label: "Status" },
          { value: "in_progress,todo", label: "Active" },
          ...TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s })),
        ]}
        active={!!filters.status}
        onChange={(v) => onChange({ ...filters, status: v || undefined })}
        ariaLabel="Filter by status"
      />

      {projects.length > 1 && (
        <PillSelect
          value={filters.project_id ?? ""}
          options={[
            { value: "", label: "Project" },
            ...projects.map((p) => ({ value: p.id, label: p.title })),
          ]}
          active={!!filters.project_id}
          onChange={(v) => onChange({ ...filters, project_id: v || undefined })}
          ariaLabel="Filter by project"
        />
      )}

      <PillSelect
        value={filters.category ?? ""}
        options={[
          { value: "", label: "Category" },
          ...TASK_CATEGORIES.map((c) => ({ value: c, label: c })),
        ]}
        active={!!filters.category}
        onChange={(v) => onChange({ ...filters, category: v || undefined })}
        ariaLabel="Filter by category"
      />

      <PillSelect
        value={filters.effort ?? ""}
        options={[
          { value: "", label: "Effort" },
          ...EFFORT_LEVELS.map((e) => ({ value: e, label: e })),
        ]}
        active={!!filters.effort}
        onChange={(v) => onChange({ ...filters, effort: v || undefined })}
        ariaLabel="Filter by effort"
      />

      <PillSelect
        value={filters.impact ?? ""}
        options={[
          { value: "", label: "Impact" },
          ...IMPACT_LEVELS.map((i) => ({ value: i, label: i })),
        ]}
        active={!!filters.impact}
        onChange={(v) => onChange({ ...filters, impact: v || undefined })}
        ariaLabel="Filter by impact"
      />

      <PillSelect
        value={filters.blocked ?? ""}
        options={[
          { value: "", label: `Blocked${blockedCount > 0 ? ` (${blockedCount})` : ""}` },
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ]}
        active={!!filters.blocked}
        onChange={(v) => onChange({ ...filters, blocked: v || undefined })}
        ariaLabel="Filter by blocked status"
      />

      {activeCount > 0 && (
        <button
          onClick={onClearAll}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: `6px ${t.spaceMd}`, borderRadius: t.radiusFull,
            border: "none", background: "transparent",
            color: t.colorTextMuted, fontSize: t.fontSizeSm,
            fontFamily: t.fontSans, fontWeight: 600, cursor: "pointer",
            minHeight: 32,
          }}
        >
          <Icon name="close" size={12} />
          Clear ({activeCount})
        </button>
      )}
    </div>
  );
}

// PillSelect imported from ../components/PillSelect

// ---------------------------------------------------------------------------
// Task table view (proper Table compound component)
// ---------------------------------------------------------------------------

const TABLE_COLUMNS = 8; // status, title, category, effort, impact, project, updated, actions

function TaskTableView({
  tasks,
  projectMap,
  onSelect,
  onStatusChange,
  onDelete,
}: {
  tasks: TaskSummary[];
  projectMap: Map<string, string>;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (task: TaskSummary) => void;
}) {
  return (
    <Table variant="default" density="sm" style={{ background: t.colorSurfaceSolid, flexShrink: 0 }}>
      <TableHeader>
        <TableHeaderCell width={130}>Status</TableHeaderCell>
        <TableHeaderCell>Title</TableHeaderCell>
        <TableHeaderCell width={90}>Category</TableHeaderCell>
        <TableHeaderCell width={70}>Effort</TableHeaderCell>
        <TableHeaderCell width={70}>Impact</TableHeaderCell>
        <TableHeaderCell width={120}>Project</TableHeaderCell>
        <TableHeaderCell width={90}>Updated</TableHeaderCell>
        <TableHeaderCell width={40} aria-label="Actions" />
      </TableHeader>
      <TableBody>
        {tasks.length === 0 ? (
          <TableEmptyRow colSpan={TABLE_COLUMNS}>
            No tasks match the current filters.
          </TableEmptyRow>
        ) : (
          tasks.map((task, i) => {
            const statusColor = STATUS_COLORS[task.status] ?? t.colorTextMuted;
            const projectName = projectMap.get(task.project_id);
            return (
              <TableRow
                key={task.id}
                hoverable
                onClick={() => onSelect(task.id)}
                style={{
                  cursor: "pointer",
                  ...staggerStyle(i, { delayMs: 15, maxMs: 200, duration: 0.25 }),
                }}
              >
                {/* Status */}
                <TableCell width={130}>
                  <TaskStatusSelect
                    status={task.status}
                    title={task.title}
                    isBlocked={task.is_blocked}
                    onChange={(s) => onStatusChange(task.id, s)}
                  />
                </TableCell>

                {/* Title */}
                <TableCell truncate>
                  <span style={{
                    fontWeight: 600, fontSize: t.fontSizeSm,
                    color: task.status === "done" ? t.colorTextMuted : t.colorText,
                    textDecoration: task.status === "done" ? "line-through" : "none",
                  }}>
                    {task.title}
                  </span>
                  {task.summary && (
                    <span style={{
                      marginLeft: t.spaceXs, fontSize: t.fontSizeXs,
                      color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)`,
                    }}>
                      — {task.summary}
                    </span>
                  )}
                </TableCell>

                {/* Category */}
                <TableCell width={90} muted>
                  {task.category ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <Icon name={CATEGORY_ICONS[task.category] ?? "label"} size={12} style={{ color: t.colorTextMuted }} />
                      <span style={{ fontSize: t.fontSizeXs }}>{task.category}</span>
                    </span>
                  ) : (
                    <span style={{ color: `color-mix(in srgb, ${t.colorTextMuted} 40%, transparent)` }}>--</span>
                  )}
                </TableCell>

                {/* Effort */}
                <TableCell width={70} muted>
                  {task.effort ? (
                    <MetaPill>{task.effort}</MetaPill>
                  ) : (
                    <span style={{ color: `color-mix(in srgb, ${t.colorTextMuted} 40%, transparent)` }}>--</span>
                  )}
                </TableCell>

                {/* Impact */}
                <TableCell width={70} muted>
                  {task.impact ? (
                    <MetaPill>{task.impact}</MetaPill>
                  ) : (
                    <span style={{ color: `color-mix(in srgb, ${t.colorTextMuted} 40%, transparent)` }}>--</span>
                  )}
                </TableCell>

                {/* Project */}
                <TableCell width={120} truncate muted>
                  {projectName ? (
                    <span style={{ fontSize: "0.65rem", fontFamily: t.fontMono }}>
                      {projectName}
                    </span>
                  ) : (
                    <span style={{ color: `color-mix(in srgb, ${t.colorTextMuted} 40%, transparent)` }}>--</span>
                  )}
                </TableCell>

                {/* Updated */}
                <TableCell width={90} muted>
                  <span style={{ fontSize: "0.65rem", fontFamily: t.fontMono }}>
                    {formatRelativeDate(task.updated_at)}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell width={40}>
                  <IconButton
                    icon="delete"
                    size={14}
                    aria-label={`Delete ${task.title}`}
                    onClick={(e) => { e.stopPropagation(); onDelete(task); }}
                  />
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Task card grid view
// ---------------------------------------------------------------------------

function TaskCardGrid({
  tasks,
  projectMap,
  onSelect,
  onStatusChange,
  onDelete,
}: {
  tasks: TaskSummary[];
  projectMap: Map<string, string>;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (task: TaskSummary) => void;
}) {
  return (
    <Grid minColumnWidth={300} gap="md">
      {tasks.map((task, i) => {
        const statusColor = STATUS_COLORS[task.status] ?? t.colorTextMuted;
        const projectName = projectMap.get(task.project_id);
        return (
          <Surface
            key={task.id}
            className="tp-card"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(task.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(task.id); } }}
            padding="md"
            border
            shadow="sm"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: t.spaceSm,
              cursor: "pointer",
              overflow: "hidden",
              ...staggerStyle(i, { delayMs: 25 }),
              borderLeft: `3px solid color-mix(in srgb, ${statusColor} 60%, transparent)`,
            }}
          >
            {/* Header: status + actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <TaskStatusSelect
                status={task.status}
                title={task.title}
                isBlocked={task.is_blocked}
                onChange={(s) => onStatusChange(task.id, s)}
              />
              <IconButton icon="delete" size={14} aria-label={`Delete ${task.title}`}
                onClick={(e) => { e.stopPropagation(); onDelete(task); }} />
            </div>

            {/* Title */}
            <h3 className="tp-card-title" style={{
              margin: 0, fontSize: t.fontSizeSm, fontWeight: 700, fontFamily: t.fontSans,
              color: task.status === "done" ? t.colorTextMuted : t.colorText,
              textDecoration: task.status === "done" ? "line-through" : "none",
              transition: "color 0.15s",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {task.title}
            </h3>

            {/* Summary */}
            {task.summary ? (
              <p style={{
                margin: 0, fontSize: t.fontSizeXs, color: t.colorTextMuted,
                lineHeight: t.lineHeightRelaxed,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {task.summary}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: t.fontSizeXs, color: `color-mix(in srgb, ${t.colorTextMuted} 40%, transparent)`, fontStyle: "italic" }}>
                No summary
              </p>
            )}

            {/* Meta row */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {task.category && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <Icon name={CATEGORY_ICONS[task.category] ?? "label"} size={11} style={{ color: t.colorTextMuted }} />
                  <MetaPill>{task.category}</MetaPill>
                </span>
              )}
              {task.effort && <MetaPill>E: {task.effort}</MetaPill>}
              {task.impact && <MetaPill>I: {task.impact}</MetaPill>}
              {task.has_context && <Icon name="info" size={11} title="Has context" style={{ color: `color-mix(in srgb, ${t.colorTextMuted} 50%, transparent)` }} />}
              {task.has_acceptance_criteria && <Icon name="check_circle" size={11} title="Has acceptance criteria" style={{ color: `color-mix(in srgb, ${t.colorTextMuted} 50%, transparent)` }} />}
            </div>

            {/* Footer */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginTop: "auto", fontSize: "0.6rem", fontFamily: t.fontMono,
              color: `color-mix(in srgb, ${t.colorTextMuted} 60%, transparent)`,
            }}>
              {projectName ? (
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                  {projectName}
                </span>
              ) : <span />}
              <span>{formatRelativeDate(task.updated_at)}</span>
            </div>
          </Surface>
        );
      })}
    </Grid>
  );
}

// MetaPill imported from ../components/MetaPill

// ---------------------------------------------------------------------------
// Task detail modal
// ---------------------------------------------------------------------------

function TaskDetailModal({
  task,
  projectName,
  onClose,
  onUpdate,
}: {
  task: TaskDetail;
  projectName: string | undefined;
  onClose: () => void;
  onUpdate: (taskId: string, input: Record<string, unknown>) => Promise<void>;
}) {
  const statusColor = STATUS_COLORS[task.status] ?? t.colorTextMuted;
  const { editField, editValue, startEdit, saveEdit, cancelEdit, setEditValue } =
    useInlineEdit(async (patch) => onUpdate(task.id, patch));

  return (
    <ModalShell onClose={onClose} maxWidth={720} style={{ maxHeight: "85vh", overflow: "hidden", padding: 0, display: "flex", flexDirection: "column", background: t.colorSurfaceSolid }}>
      {/* Header */}
      <div style={{
        padding: `${t.spaceLg} ${t.spaceXl}`,
        borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 30%, transparent)`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: t.spaceSm }}>
          <StatusDot
            color={statusColor}
            size={10}
            animate={task.status === "in_progress" ? "pulse" : "none"}
            style={{ marginTop: 8 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {editField === "title" ? (
              <Input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit("title"); if (e.key === "Escape") cancelEdit(); }}
                onBlur={() => saveEdit("title")} autoFocus
                style={{ fontSize: t.fontSizeLg, fontWeight: 700, fontFamily: t.fontSerif }} />
            ) : (
              <h2 onClick={() => startEdit("title", task.title)} style={{
                margin: 0, fontSize: t.fontSizeLg, fontWeight: 700,
                fontFamily: t.fontSerif, color: t.colorText, cursor: "pointer",
              }} title="Click to edit">
                {task.title}
              </h2>
            )}
            {projectName && (
              <span style={{ fontSize: t.fontSizeXs, color: t.colorTextMuted, marginTop: 2, display: "block" }}>
                {projectName}
              </span>
            )}
          </div>
          <IconButton icon="close" size={18} onClick={onClose} aria-label="Close" />
        </div>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, overflowY: "auto", padding: t.spaceXl,
        display: "flex", flexDirection: "column", gap: t.spaceLg,
        scrollbarWidth: "none" as const, minWidth: 0,
        overflowWrap: "break-word", wordBreak: "break-word",
      }}>
        {/* Metadata section */}
        <div>
          <SectionLabel>Properties</SectionLabel>
          <div style={{ marginTop: t.spaceSm }}>
            <MetadataTable items={[
              {
                label: "Status",
                value: (
                  <div style={{ display: "flex", alignItems: "center", gap: t.spaceXs }}>
                    <StatusDot color={statusColor} size={8} animate={task.status === "in_progress" ? "pulse" : "none"} />
                    <select
                      value={task.status}
                      onChange={(e) => onUpdate(task.id, { status: e.target.value })}
                      aria-label="Status"
                      style={{
                        appearance: "none", border: "none", background: "transparent",
                        color: statusColor, fontSize: t.fontSizeXs,
                        fontFamily: t.fontSans, fontWeight: 600, cursor: "pointer",
                        padding: 0, outline: "none",
                      }}
                    >
                      {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
                    </select>
                  </div>
                ),
              },
              {
                label: "Effort",
                value: (
                  <select
                    value={task.effort ?? ""}
                    onChange={(e) => onUpdate(task.id, { effort: e.target.value || null })}
                    aria-label="Effort"
                    style={{
                      appearance: "none", border: "none", background: "transparent",
                      color: t.colorTextSecondary, fontSize: t.fontSizeXs,
                      fontFamily: t.fontSans, fontWeight: 600, cursor: "pointer",
                      padding: 0, outline: "none",
                    }}
                  >
                    <option value="">--</option>
                    {EFFORT_LEVELS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                ),
              },
              {
                label: "Impact",
                value: (
                  <select
                    value={task.impact ?? ""}
                    onChange={(e) => onUpdate(task.id, { impact: e.target.value || null })}
                    aria-label="Impact"
                    style={{
                      appearance: "none", border: "none", background: "transparent",
                      color: t.colorTextSecondary, fontSize: t.fontSizeXs,
                      fontFamily: t.fontSans, fontWeight: 600, cursor: "pointer",
                      padding: 0, outline: "none",
                    }}
                  >
                    <option value="">--</option>
                    {IMPACT_LEVELS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                ),
              },
              {
                label: "Category",
                value: (
                  <select
                    value={task.category ?? ""}
                    onChange={(e) => onUpdate(task.id, { category: e.target.value || null })}
                    aria-label="Category"
                    style={{
                      appearance: "none", border: "none", background: "transparent",
                      color: t.colorTextSecondary, fontSize: t.fontSizeXs,
                      fontFamily: t.fontSans, fontWeight: 600, cursor: "pointer",
                      padding: 0, outline: "none",
                    }}
                  >
                    <option value="">--</option>
                    {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                ),
              },
              ...(task.is_blocked ? [{
                label: "Blocked",
                value: <Badge variant="error">Yes</Badge>,
              }] : []),
            ]} />
          </div>
        </div>

        {/* Summary */}
        <div>
          <SectionLabel>Summary</SectionLabel>
          <div style={{ marginTop: t.spaceSm }}>
            <TextSection
              content={task.summary}
              editing={editField === "summary"}
              editValue={editValue}
              onStartEdit={() => startEdit("summary", task.summary ?? "")}
              onEditChange={setEditValue}
              onSave={() => saveEdit("summary")}
              onCancel={cancelEdit}
              fieldLabel="Summary"
              rows={3}
            />
          </div>
        </div>

        {/* Context */}
        <div>
          <SectionLabel>Context</SectionLabel>
          <div style={{ marginTop: t.spaceSm }}>
            <TextSection
              content={task.context}
              editing={editField === "context"}
              editValue={editValue}
              onStartEdit={() => startEdit("context", task.context ?? "")}
              onEditChange={setEditValue}
              onSave={() => saveEdit("context")}
              onCancel={cancelEdit}
              fieldLabel="Context"
              rows={5}
              placeholder="Background, rationale, design notes..."
            />
          </div>
        </div>

        {/* Acceptance Criteria */}
        <div>
          <SectionLabel>Acceptance Criteria</SectionLabel>
          <div style={{ marginTop: t.spaceSm }}>
            <TextSection
              content={task.acceptance_criteria}
              editing={editField === "acceptance_criteria"}
              editValue={editValue}
              onStartEdit={() => startEdit("acceptance_criteria", task.acceptance_criteria ?? "")}
              onEditChange={setEditValue}
              onSave={() => saveEdit("acceptance_criteria")}
              onCancel={cancelEdit}
              fieldLabel="Acceptance Criteria"
              rows={5}
              placeholder="What conditions must be met..."
            />
          </div>
        </div>

        {/* Footer metadata */}
        <div style={{
          marginTop: "auto", paddingTop: t.spaceMd,
          borderTop: `1px solid color-mix(in srgb, ${t.colorBorder} 30%, transparent)`,
          display: "flex", gap: t.spaceLg, fontSize: "0.65rem",
          fontFamily: t.fontMono, color: `color-mix(in srgb, ${t.colorTextMuted} 60%, transparent)`,
        }}>
          <span>ID: {task.id.slice(0, 8)}...</span>
          <span>Created: {formatRelativeDate(task.created_at)}</span>
          <span>Updated: {formatRelativeDate(task.updated_at)}</span>
        </div>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// TasksPage
// ---------------------------------------------------------------------------

export function TasksPage() {
  useInjectStyles(STYLES_ID, STYLES_CSS);
  const { showToast } = useToast();
  const { projects } = useProjects();
  const { subscribeEvents } = useEventSubscription();

  // Filters & pagination
  const [filters, setFilters] = useState<TaskFilters>({ status: "in_progress,todo" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");

  // Data
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Task detail
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskSummary | null>(null);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.title])), [projects]);

  // Blocked count computed from loaded tasks
  const blockedCount = useMemo(() => tasks.filter((t) => t.is_blocked).length, [tasks]);

  // Load tasks
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const searchRef = useRef(search);
  searchRef.current = search;
  const pageRef = useRef(page);
  pageRef.current = page;

  const loadRef = useRef<(() => void) | undefined>(undefined);

  async function loadTasks() {
    try {
      const f = filtersRef.current;
      const body = await fetchTasks({
        ...(searchRef.current ? { title: searchRef.current } : {}),
        ...(f.status ? { status: f.status } : {}),
        ...(f.project_id ? { project_id: f.project_id } : {}),
        ...(f.effort ? { effort: f.effort } : {}),
        ...(f.impact ? { impact: f.impact } : {}),
        ...(f.category ? { category: f.category } : {}),
        limit: PAGE_SIZE,
        offset: (pageRef.current - 1) * PAGE_SIZE,
      });
      setTasks(body.data);
      setTotal(body.total);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  loadRef.current = loadTasks;

  const throttledLoad = useThrottledCallback(() => { loadRef.current?.(); }, 200);

  // Reset page on filter change
  const filterKey = JSON.stringify({ ...filters, search });
  useEffect(() => { setPage(1); }, [filterKey]);

  useEffect(() => {
    setLoading(true);
    loadTasks();
    return subscribeEvents((event) => {
      if (event.entity_type === "task") throttledLoad();
    });
  }, [subscribeEvents, throttledLoad, page, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Selected task loading
  const selectedTaskIdRef = useRef(selectedTaskId);
  selectedTaskIdRef.current = selectedTaskId;

  const loadSelectedTask = useCallback((taskId: string) => {
    let cancelled = false;
    fetchTask(taskId)
      .then((task) => { if (!cancelled && selectedTaskIdRef.current === taskId) setSelectedTask(task); })
      .catch(() => { if (!cancelled) setSelectedTask(null); });
    return () => { cancelled = true; };
  }, []);

  const throttledLoadSelected = useThrottledCallback(() => {
    const id = selectedTaskIdRef.current;
    if (id) loadSelectedTask(id);
  }, 200);

  useEffect(() => {
    if (!selectedTaskId) { setSelectedTask(null); return; }
    const cancelFetch = loadSelectedTask(selectedTaskId);
    const unsub = subscribeEvents((event) => {
      if (event.entity_type === "task") throttledLoadSelected();
    });
    return () => { cancelFetch(); unsub(); };
  }, [selectedTaskId, subscribeEvents, loadSelectedTask, throttledLoadSelected]);

  // Handlers
  async function handleStatusChange(taskId: string, status: TaskStatus) {
    try { await updateTasks([{ id: taskId, status }]); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "Failed to update status"); }
  }

  async function handleUpdateTask(taskId: string, input: Record<string, unknown>) {
    try { await updateTasks([{ id: taskId, ...input } as Parameters<typeof updateTasks>[0][0]]); }
    catch (err) { showToast(err instanceof ApiError ? err.message : "Failed to update task"); throw err; }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteTasks([deleteTarget.id]);
      if (selectedTaskId === deleteTarget.id) setSelectedTaskId(null);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete task");
    }
  }

  const activeFilterCount = [filters.status, filters.project_id, filters.effort, filters.impact, filters.category, filters.blocked].filter(Boolean).length;

  function clearFilters() {
    setFilters({});
  }

  // Update search in filters
  function handleSearchChange(v: string) {
    setSearch(v);
    setFilters((f) => ({ ...f, title: v || undefined }));
  }

  return (
    <PageShell maxWidth={1200} gap="md" topPadding={false}>
      {/* Dashboard header */}
      <DashboardHeader total={total} search={search} onSearchChange={handleSearchChange} />

      {/* Summary zone — at-a-glance stats */}
      {!loading && tasks.length > 0 && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: t.spaceSm,
          paddingBottom: t.spaceMd,
          borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 40%, transparent)`,
        }}>
          <StatusDistribution tasks={tasks} total={total} />
          <CategoryDistribution tasks={tasks} />
        </div>
      )}

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        projects={projects.map((p) => ({ id: p.id, title: p.title }))}
        activeCount={activeFilterCount}
        onClearAll={clearFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        blockedCount={blockedCount}
      />

      {/* Content */}
      {loading ? (
        viewMode === "cards" ? (
          <Grid minColumnWidth={300} gap="md">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={140} />)}
          </Grid>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)}
          </div>
        )
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="search"
          message={
            activeFilterCount > 0 || search
              ? "No tasks match those filters. Try broadening your search."
              : "No tasks across any project yet."
          }
          variant="card"
        />
      ) : viewMode === "cards" ? (
        <TaskCardGrid
          tasks={tasks}
          projectMap={projectMap}
          onSelect={setSelectedTaskId}
          onStatusChange={handleStatusChange}
          onDelete={setDeleteTarget}
        />
      ) : (
        <TaskTableView
          tasks={tasks}
          projectMap={projectMap}
          onSelect={setSelectedTaskId}
          onStatusChange={handleStatusChange}
          onDelete={setDeleteTarget}
        />
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}

      {/* Task detail */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectName={projectMap.get(selectedTask.project_id)}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={handleUpdateTask}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Task"
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          variant="destructive"
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageShell>
  );
}
