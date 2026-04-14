/**
 * TasksPage — cross-project task search and management.
 *
 * UI dependencies: @4lt7ab/ui only.
 * Data dependencies: hooks, api layer, types.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { semantic as t, useInjectStyles, KEYFRAMES } from "@4lt7ab/ui/core";
import {
  Button,
  IconButton,
  Icon,
  Badge,
  StatusDot,
  SearchInput,
  Input,
  Textarea,
  Pagination,
  ConfirmDialog,
  ModalShell,
  Skeleton,
  SegmentedControl,
  useToast,
} from "@4lt7ab/ui/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLES_ID = "tasks-page-styles";
const STYLES_CSS = `
  .tp-row {
    transition: background 0.1s ease;
  }
  .tp-row:hover {
    background: ${t.colorSurfaceRaised} !important;
  }
  .tp-row:hover .tp-arrow {
    opacity: 1;
  }
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
    .tp-row, .tp-card { transition: none; }
  }
`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const STATUS_COLORS: Record<string, string> = {
  todo: t.colorTextMuted,
  in_progress: t.colorWarning,
  done: t.colorSuccess,
  archived: t.colorTextSecondary,
};

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  archived: "Archived",
};

const CATEGORY_ICONS: Record<string, string> = {
  feature: "lightbulb",
  bugfix: "bug_report",
  refactor: "construction",
  test: "science",
  perf: "speed",
  infra: "dns",
  docs: "description",
  security: "shield",
  design: "palette",
  chore: "build",
};

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
// Hero
// ---------------------------------------------------------------------------

function HeroSection({
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
      flexDirection: "column",
      alignItems: "center",
      gap: t.spaceMd,
      padding: `${t.space2xl} 0 ${t.spaceLg}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm }}>
        <Icon name="task_alt" size={28} style={{ color: t.colorActionPrimary }} />
        <h1 style={{
          margin: 0,
          fontSize: t.fontSize2xl,
          fontWeight: 700,
          fontFamily: t.fontSerif,
          color: t.colorText,
          letterSpacing: t.letterSpacingTight,
        }}>
          Tasks
        </h1>
      </div>
      <p style={{
        margin: 0,
        fontSize: t.fontSizeSm,
        color: t.colorTextMuted,
        textAlign: "center",
      }}>
        {total > 0
          ? `${total} task${total !== 1 ? "s" : ""} across all projects.`
          : "No tasks yet."}
      </p>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <SearchInput
          value={search}
          onSearch={onSearchChange}
          placeholder="Search all tasks..."
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
}: {
  filters: TaskFilters;
  onChange: (f: TaskFilters) => void;
  projects: { id: string; title: string }[];
  activeCount: number;
  onClearAll: () => void;
  viewMode: "list" | "cards";
  onViewModeChange: (v: "list" | "cards") => void;
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

      <div style={{ width: 1, height: 20, background: `color-mix(in srgb, ${t.colorBorder} 50%, transparent)`, flexShrink: 0 }} />

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
          { value: "", label: "Blocked" },
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
            padding: `4px ${t.spaceSm}`, borderRadius: t.radiusFull,
            border: "none", background: "transparent",
            color: t.colorTextMuted, fontSize: t.fontSizeXs,
            fontFamily: t.fontSans, fontWeight: 600, cursor: "pointer",
          }}
        >
          <Icon name="close" size={12} />
          Clear ({activeCount})
        </button>
      )}
    </div>
  );
}

function PillSelect({
  value, options, active, onChange, ariaLabel,
}: {
  value: string;
  options: { value: string; label: string }[];
  active: boolean;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        style={{
          appearance: "none",
          padding: `4px ${t.spaceLg} 4px ${t.spaceSm}`,
          borderRadius: t.radiusFull,
          border: `1px solid ${active ? t.colorActionPrimary : `color-mix(in srgb, ${t.colorBorder} 60%, transparent)`}`,
          background: active ? `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)` : "transparent",
          color: active ? t.colorActionPrimary : t.colorTextMuted,
          fontSize: t.fontSizeXs,
          fontFamily: t.fontSans,
          fontWeight: 600,
          cursor: "pointer",
          outline: "none",
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="expand_more" size={12} style={{
        position: "absolute", right: 8, top: "50%",
        transform: "translateY(-50%)", pointerEvents: "none",
        color: active ? t.colorActionPrimary : t.colorTextMuted,
      }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task list view
// ---------------------------------------------------------------------------

function TaskListView({
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
    <div style={{ display: "flex", flexDirection: "column" }}>
      {tasks.map((task, i) => {
        const statusColor = STATUS_COLORS[task.status] ?? t.colorTextMuted;
        const projectName = projectMap.get(task.project_id);
        return (
          <div
            key={task.id}
            className="tp-row"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(task.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(task.id); } }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: t.spaceSm,
              padding: `${t.spaceSm} ${t.spaceMd}`,
              borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 25%, transparent)`,
              cursor: "pointer",
              animation: `${KEYFRAMES.fadeInUp} 0.25s ease both`,
              animationDelay: `${Math.min(i * 15, 200)}ms`,
            }}
          >
            <StatusDot color={statusColor} size={8} />

            {/* Status quick-toggle */}
            <select
              value={task.status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { e.stopPropagation(); onStatusChange(task.id, e.target.value as TaskStatus); }}
              aria-label={`Status for ${task.title}`}
              style={{
                appearance: "none", border: "none", background: "transparent",
                color: statusColor, fontSize: "0.6rem", fontFamily: t.fontMono,
                fontWeight: 700, textTransform: "uppercase", cursor: "pointer",
                width: 70, padding: 0, outline: "none", letterSpacing: "0.03em",
              }}
            >
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
            </select>

            {/* Title + summary */}
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <span style={{
                fontWeight: 600, fontSize: t.fontSizeSm,
                color: task.status === "done" ? t.colorTextMuted : t.colorText,
                textDecoration: task.status === "done" ? "line-through" : "none",
              }}>
                {task.title}
              </span>
              {task.summary && (
                <span style={{ marginLeft: t.spaceXs, fontSize: t.fontSizeXs, color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)` }}>
                  — {task.summary}
                </span>
              )}
            </div>

            {/* Blocked */}
            {task.is_blocked && <Badge variant="error">blocked</Badge>}

            {/* Category icon */}
            {task.category && (
              <Icon
                name={CATEGORY_ICONS[task.category] ?? "label"}
                size={14}
                title={task.category}
                style={{ color: t.colorTextMuted, flexShrink: 0 }}
              />
            )}

            {/* Effort/impact pills */}
            {task.effort && <MetaPill>{task.effort}</MetaPill>}
            {task.impact && <MetaPill>{task.impact}</MetaPill>}

            {/* Project name */}
            {projectName && (
              <span style={{
                fontSize: "0.6rem", fontFamily: t.fontMono,
                color: `color-mix(in srgb, ${t.colorTextMuted} 60%, transparent)`,
                maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {projectName}
              </span>
            )}

            <Icon name="chevron_right" size={14} className="tp-arrow"
              style={{ color: t.colorTextMuted, opacity: 0, transition: "opacity 0.15s", flexShrink: 0 }} />

            <IconButton icon="delete" size={14} aria-label={`Delete ${task.title}`}
              onClick={(e) => { e.stopPropagation(); onDelete(task); }} />
          </div>
        );
      })}
    </div>
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
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: t.spaceMd,
    }}>
      {tasks.map((task, i) => {
        const statusColor = STATUS_COLORS[task.status] ?? t.colorTextMuted;
        const projectName = projectMap.get(task.project_id);
        return (
          <div
            key={task.id}
            className="tp-card"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(task.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(task.id); } }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: t.spaceSm,
              padding: t.spaceMd,
              borderRadius: t.radiusLg,
              border: `1px solid ${t.colorBorder}`,
              background: t.colorSurface,
              boxShadow: t.shadowSm,
              cursor: "pointer",
              overflow: "hidden",
              animation: `${KEYFRAMES.fadeInUp} 0.3s ease both`,
              animationDelay: `${Math.min(i * 25, 300)}ms`,
              borderLeft: `3px solid color-mix(in srgb, ${statusColor} 60%, transparent)`,
            }}
          >
            {/* Header: status + actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: t.spaceXs }}>
                <StatusDot color={statusColor} size={8} />
                <select
                  value={task.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { e.stopPropagation(); onStatusChange(task.id, e.target.value as TaskStatus); }}
                  aria-label={`Status for ${task.title}`}
                  style={{
                    appearance: "none", border: "none", background: "transparent",
                    color: statusColor, fontSize: "0.6rem", fontFamily: t.fontMono,
                    fontWeight: 700, textTransform: "uppercase", cursor: "pointer",
                    padding: 0, outline: "none", letterSpacing: "0.03em",
                  }}
                >
                  {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
                </select>
                {task.is_blocked && <Badge variant="error">blocked</Badge>}
              </div>
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
          </div>
        );
      })}
    </div>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      padding: `1px ${t.spaceXs}`, borderRadius: t.radiusSm,
      background: `color-mix(in srgb, ${t.colorBorder} 40%, transparent)`,
      fontSize: "0.6rem", fontFamily: t.fontMono, fontWeight: 500,
      color: t.colorTextMuted, letterSpacing: "0.02em",
    }}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Task detail modal
// ---------------------------------------------------------------------------

const mdComponents: Record<string, React.ComponentType<Record<string, unknown>>> = {
  h1: ({ children, ...p }) => <h1 {...p} style={{ fontSize: t.fontSizeXl, fontWeight: 700, fontFamily: t.fontSans, color: t.colorText, margin: `${t.spaceLg} 0 ${t.spaceSm}` }}>{children as React.ReactNode}</h1>,
  h2: ({ children, ...p }) => <h2 {...p} style={{ fontSize: t.fontSizeLg, fontWeight: 700, fontFamily: t.fontSans, color: t.colorText, margin: `${t.spaceLg} 0 ${t.spaceSm}` }}>{children as React.ReactNode}</h2>,
  h3: ({ children, ...p }) => <h3 {...p} style={{ fontSize: t.fontSizeBase, fontWeight: 600, fontFamily: t.fontSans, color: t.colorText, margin: `${t.spaceMd} 0 ${t.spaceXs}` }}>{children as React.ReactNode}</h3>,
  p: ({ children, ...p }) => <p {...p} style={{ margin: `${t.spaceSm} 0`, overflowWrap: "break-word", whiteSpace: "pre-wrap" }}>{children as React.ReactNode}</p>,
  a: ({ children, href, ...p }) => <a {...p} href={href as string} style={{ color: t.colorTextLink, textDecoration: "underline", textUnderlineOffset: "3px" }}>{children as React.ReactNode}</a>,
  ul: ({ children, ...p }) => <ul {...p} style={{ paddingLeft: "1.25rem", margin: `${t.spaceSm} 0` }}>{children as React.ReactNode}</ul>,
  ol: ({ children, ...p }) => <ol {...p} style={{ paddingLeft: "1.25rem", margin: `${t.spaceSm} 0` }}>{children as React.ReactNode}</ol>,
  li: ({ children, ...p }) => <li {...p} style={{ marginTop: "0.25em" }}>{children as React.ReactNode}</li>,
  blockquote: ({ children, ...p }) => <blockquote {...p} style={{ borderLeft: `3px solid ${t.colorBorder}`, paddingLeft: t.spaceMd, margin: `${t.spaceMd} 0`, color: t.colorTextSecondary }}>{children as React.ReactNode}</blockquote>,
  pre: ({ children, ...p }) => <pre {...p} style={{ background: t.colorSurfacePanel, border: `1px solid ${t.colorBorder}`, borderRadius: t.radiusMd, padding: t.spaceMd, margin: `${t.spaceMd} 0`, overflowX: "auto", fontSize: t.fontSizeXs, lineHeight: t.lineHeightBase }}>{children as React.ReactNode}</pre>,
  code: ({ children, className, ...p }) => {
    if (className) return <code {...p} className={className as string} style={{ fontFamily: t.fontMono, fontSize: "inherit", color: t.colorTextSecondary }}>{children as React.ReactNode}</code>;
    return <code {...p} style={{ fontFamily: t.fontMono, fontSize: "0.875em", background: t.colorSurfacePanel, padding: "0.1em 0.3em", borderRadius: t.radiusSm }}>{children as React.ReactNode}</code>;
  },
  strong: ({ children, ...p }) => <strong {...p} style={{ fontWeight: 600, color: t.colorText }}>{children as React.ReactNode}</strong>,
};

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
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function startEdit(field: string, current: string) { setEditField(field); setEditValue(current); }
  async function saveEdit(field: string) {
    const trimmed = editValue.trim();
    await onUpdate(task.id, { [field]: trimmed || null });
    setEditField(null);
  }
  function cancelEdit() { setEditField(null); }

  const toOpts = (values: readonly string[], none = "—") => [
    { value: "", label: none },
    ...values.map((v) => ({ value: v, label: v.replace(/_/g, " ") })),
  ];

  return (
    <ModalShell onClose={onClose} maxWidth={680} style={{ maxHeight: "85vh", overflow: "hidden", padding: 0, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        padding: `${t.spaceLg} ${t.spaceXl}`,
        borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 30%, transparent)`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: t.spaceSm }}>
          <StatusDot color={statusColor} size={10} style={{ marginTop: 8 }} />
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

        <div style={{ display: "flex", gap: t.spaceSm, flexWrap: "wrap", marginTop: t.spaceSm, alignItems: "center" }}>
          <MetaSelect label="Status" value={task.status} color={statusColor}
            options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s }))}
            onChange={(v) => onUpdate(task.id, { status: v })} />
          <MetaSelect label="Effort" value={task.effort ?? ""} options={toOpts(EFFORT_LEVELS)}
            onChange={(v) => onUpdate(task.id, { effort: v || null })} />
          <MetaSelect label="Impact" value={task.impact ?? ""} options={toOpts(IMPACT_LEVELS)}
            onChange={(v) => onUpdate(task.id, { impact: v || null })} />
          <MetaSelect label="Category" value={task.category ?? ""} options={toOpts(TASK_CATEGORIES)}
            onChange={(v) => onUpdate(task.id, { category: v || null })} />
          {task.is_blocked && <Badge variant="error">blocked</Badge>}
        </div>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, overflowY: "auto", padding: t.spaceXl,
        display: "flex", flexDirection: "column", gap: t.spaceMd,
        scrollbarWidth: "none" as const, minWidth: 0,
        overflowWrap: "break-word", wordBreak: "break-word",
      }}>
        <TextSection label="Summary" content={task.summary} editing={editField === "summary"} editValue={editValue}
          onStartEdit={() => startEdit("summary", task.summary ?? "")} onEditChange={setEditValue}
          onSave={() => saveEdit("summary")} onCancel={cancelEdit} />
        <TextSection label="Context" content={task.context} editing={editField === "context"} editValue={editValue}
          onStartEdit={() => startEdit("context", task.context ?? "")} onEditChange={setEditValue}
          onSave={() => saveEdit("context")} onCancel={cancelEdit} />
        <TextSection label="Acceptance Criteria" content={task.acceptance_criteria} editing={editField === "acceptance_criteria"} editValue={editValue}
          onStartEdit={() => startEdit("acceptance_criteria", task.acceptance_criteria ?? "")} onEditChange={setEditValue}
          onSave={() => saveEdit("acceptance_criteria")} onCancel={cancelEdit} />

        <div style={{
          marginTop: "auto", paddingTop: t.spaceMd,
          borderTop: `1px solid color-mix(in srgb, ${t.colorBorder} 30%, transparent)`,
          display: "flex", gap: t.spaceLg, fontSize: "0.65rem",
          fontFamily: t.fontMono, color: `color-mix(in srgb, ${t.colorTextMuted} 60%, transparent)`,
        }}>
          <span>ID: {task.id.slice(0, 8)}…</span>
          <span>Created: {formatRelativeDate(task.created_at)}</span>
          <span>Updated: {formatRelativeDate(task.updated_at)}</span>
        </div>
      </div>
    </ModalShell>
  );
}

function MetaSelect({ label, value, options, color, onChange }: {
  label: string; value: string; options: { value: string; label: string }[];
  color?: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: "0.6rem", fontFamily: t.fontMono, color: t.colorTextMuted, textTransform: "uppercase" }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
        style={{ appearance: "none", border: "none", background: "transparent",
          color: color ?? t.colorTextSecondary, fontSize: t.fontSizeXs,
          fontFamily: t.fontSans, fontWeight: 600, cursor: "pointer",
          padding: `2px ${t.spaceXs}`, outline: "none" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TextSection({ label, content, editing, editValue, onStartEdit, onEditChange, onSave, onCancel }: {
  label: string; content: string | null; editing: boolean; editValue: string;
  onStartEdit: () => void; onEditChange: (v: string) => void; onSave: () => void; onCancel: () => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm, marginBottom: t.spaceXs }}>
        <span style={{ fontSize: t.fontSizeXs, fontWeight: 700, color: t.colorTextMuted, textTransform: "uppercase", letterSpacing: t.letterSpacingWide }}>
          {label}
        </span>
        {!editing && <IconButton icon="edit" size={12} onClick={onStartEdit} aria-label={`Edit ${label}`} />}
      </div>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: t.spaceSm }}>
          <Textarea value={editValue} onChange={(e) => onEditChange(e.target.value)} autoFocus rows={4}
            placeholder={`${label}...`} style={{ width: "100%", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: t.spaceSm, justifyContent: "flex-end" }}>
            <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={onSave}>Save</Button>
          </div>
        </div>
      ) : content ? (
        <div onClick={onStartEdit} style={{
          cursor: "pointer", fontSize: t.fontSizeSm, lineHeight: t.lineHeightRelaxed,
          color: t.colorTextMuted, overflowWrap: "break-word", wordBreak: "break-word", whiteSpace: "pre-wrap",
        }} title="Click to edit">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{content}</ReactMarkdown>
        </div>
      ) : (
        <p onClick={onStartEdit} style={{
          margin: 0, fontSize: t.fontSizeSm, color: `color-mix(in srgb, ${t.colorTextMuted} 50%, transparent)`,
          fontStyle: "italic", cursor: "pointer",
        }}>
          No {label.toLowerCase()}. Click to add.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
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
    <div style={{
      flex: 1, width: "100%", maxWidth: 1100, alignSelf: "center",
      display: "flex", flexDirection: "column",
      padding: `0 ${t.spaceXl} ${t.space2xl}`,
      boxSizing: "border-box", overflowY: "auto",
      scrollbarWidth: "none" as const, gap: t.spaceLg,
    }}>
      <HeroSection total={total} search={search} onSearchChange={handleSearchChange} />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        projects={projects.map((p) => ({ id: p.id, title: p.title }))}
        activeCount={activeFilterCount}
        onClearAll={clearFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Content */}
      {loading ? (
        viewMode === "cards" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: t.spaceMd }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={140} />)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={40} />)}
          </div>
        )
      ) : tasks.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: t.spaceMd, padding: `${t.spaceXl} 0`,
        }}>
          <Icon name="search_off" size={48} style={{ color: `color-mix(in srgb, ${t.colorTextMuted} 35%, transparent)` }} />
          <p style={{ margin: 0, fontSize: t.fontSizeSm, color: t.colorTextMuted, textAlign: "center", maxWidth: 320, lineHeight: t.lineHeightRelaxed }}>
            {activeFilterCount > 0 || search
              ? "No tasks match those filters. Try broadening your search."
              : "No tasks across any project yet."}
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <TaskCardGrid
          tasks={tasks}
          projectMap={projectMap}
          onSelect={setSelectedTaskId}
          onStatusChange={handleStatusChange}
          onDelete={setDeleteTarget}
        />
      ) : (
        <TaskListView
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
    </div>
  );
}
