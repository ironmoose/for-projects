/**
 * ProjectDetailPage — self-contained project detail page.
 *
 * UI dependencies: @4lt7ab/ui only. No internal atoms/molecules/organisms.
 * Data dependencies: hooks (useProject, useProjectTasks) and api layer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { semantic as t, useInjectStyles, KEYFRAMES } from "@4lt7ab/ui/core";
import {
  Button,
  IconButton,
  Icon,
  Badge,
  StatusDot,
  ProgressBar,
  ExpandableCard,
  SearchInput,
  Select,
  Input,
  Textarea,
  Field,
  Pagination,
  ConfirmDialog,
  FormModal,
  ModalShell,
  Skeleton,
  SegmentedControl,
  useToast,
} from "@4lt7ab/ui/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useProject } from "../hooks/useProject";
import { useProjectTasks } from "../hooks/useProjectTasks";
import type { TaskFilter } from "../hooks/useProjectTasks";
import { useEventSubscription } from "../hooks/useEventSubscription";
import { useThrottledCallback } from "../hooks/useThrottledCallback";
import { ApiError, fetchTask, updateTasks } from "../api";
import type { TaskDetail } from "../api";
import { TASK_STATUSES, EFFORT_LEVELS, IMPACT_LEVELS, TASK_CATEGORIES } from "../types";
import type { TaskSummary, TaskStatus } from "../types";

// ---------------------------------------------------------------------------
// Injected styles
// ---------------------------------------------------------------------------

const STYLES_ID = "project-detail-styles";
const STYLES_CSS = `
  .pd-task-row {
    transition: background 0.1s ease;
  }
  .pd-task-row:hover {
    background: ${t.colorSurfaceRaised} !important;
  }
  .pd-task-row:hover .pd-task-arrow {
    opacity: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .pd-task-row { transition: none; }
  }
`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Project header
// ---------------------------------------------------------------------------

function ProjectHeader({
  title,
  summary,
  context,
  requirements,
  taskTotal,
  statusCounts,
  onBack,
  onAddTask,
}: {
  title: string;
  summary: string | null;
  context: string | null;
  requirements: string | null;
  taskTotal: number;
  statusCounts: Record<string, number>;
  onBack: () => void;
  onAddTask: () => void;
}) {
  const done = statusCounts["done"] ?? 0;
  const inProgress = statusCounts["in_progress"] ?? 0;
  const todo = statusCounts["todo"] ?? 0;
  const pct = taskTotal > 0 ? Math.round((done / taskTotal) * 100) : 0;

  // Which briefing panels have content?
  const panels: { key: string; icon: string; label: string; content: string }[] = [];
  if (summary) panels.push({ key: "summary", icon: "subject", label: "Summary", content: summary });
  if (context) panels.push({ key: "context", icon: "info", label: "Context", content: context });
  if (requirements) panels.push({ key: "requirements", icon: "checklist", label: "Requirements", content: requirements });

  const [expandedPanel, setExpandedPanel] = useState<string | null>(panels.length === 1 ? panels[0].key : null);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: t.spaceMd,
      paddingBottom: t.spaceLg,
      borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 30%, transparent)`,
    }}>
      {/* Back + actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.spaceXs,
            border: "none",
            background: "transparent",
            color: t.colorTextMuted,
            fontSize: t.fontSizeXs,
            fontFamily: t.fontSans,
            fontWeight: 600,
            cursor: "pointer",
            padding: `${t.spaceXs} 0`,
          }}
        >
          <Icon name="arrow_back" size={14} />
          All Projects
        </button>
        <Button size="sm" onClick={onAddTask}>
          <Icon name="add" size={15} />
          Add Task
        </Button>
      </div>

      {/* Title */}
      <h1 style={{
        margin: 0,
        fontSize: t.fontSize2xl,
        fontWeight: 700,
        fontFamily: t.fontSerif,
        color: t.colorText,
        letterSpacing: t.letterSpacingTight,
      }}>
        {title}
      </h1>

      {/* Progress bar — compact, always visible when tasks exist */}
      {taskTotal > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: t.spaceMd, maxWidth: 480 }}>
          <div style={{ flex: 1 }}>
            <ProgressBar
              segments={[
                { value: done, color: t.colorSuccess, label: "done" },
                { value: inProgress, color: t.colorWarning, label: "in progress" },
                { value: todo, color: `color-mix(in srgb, ${t.colorTextMuted} 40%, transparent)`, label: "to do" },
                { value: (statusCounts["archived"] ?? 0), color: `color-mix(in srgb, ${t.colorTextMuted} 20%, transparent)`, label: "archived" },
              ]}
              height={4}
              aria-label={`${pct}% complete`}
            />
          </div>
          <span style={{
            fontSize: "0.65rem",
            fontFamily: t.fontMono,
            color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)`,
            flexShrink: 0,
          }}>
            {done}/{taskTotal} · {pct}%
          </span>
        </div>
      )}

      {/* Briefing panels — collapsible tabs for summary/context/requirements */}
      {panels.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Tab strip */}
          <div style={{ display: "flex", gap: 2 }}>
            {panels.map((panel) => {
              const isExpanded = expandedPanel === panel.key;
              return (
                <button
                  key={panel.key}
                  onClick={() => setExpandedPanel(isExpanded ? null : panel.key)}
                  aria-expanded={isExpanded}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: `${t.spaceXs} ${t.spaceMd}`,
                    border: "none",
                    borderRadius: `${t.radiusMd} ${t.radiusMd} 0 0`,
                    background: isExpanded
                      ? `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)`
                      : "transparent",
                    color: isExpanded ? t.colorActionPrimary : t.colorTextMuted,
                    fontSize: t.fontSizeXs,
                    fontFamily: t.fontSans,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    borderBottom: isExpanded
                      ? `2px solid ${t.colorActionPrimary}`
                      : `2px solid transparent`,
                  }}
                >
                  <Icon name={panel.icon} size={13} />
                  {panel.label}
                  <Icon
                    name="expand_more"
                    size={12}
                    style={{
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                      transition: "transform 0.2s",
                      opacity: 0.6,
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* Expanded content */}
          {expandedPanel && (() => {
            const panel = panels.find((p) => p.key === expandedPanel);
            if (!panel) return null;
            return (
              <div style={{
                padding: `${t.spaceMd} ${t.spaceMd} ${t.spaceMd}`,
                borderLeft: `2px solid color-mix(in srgb, ${t.colorActionPrimary} 15%, transparent)`,
                marginLeft: t.spaceSm,
                fontSize: t.fontSizeSm,
                lineHeight: t.lineHeightRelaxed,
                color: t.colorTextMuted,
                overflowWrap: "break-word",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
                animation: `${KEYFRAMES.fadeInUp} 0.2s ease both`,
              }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {panel.content}
                </ReactMarkdown>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task filters
// ---------------------------------------------------------------------------

const STATUS_FILTER_OPTIONS = [
  { value: "in_progress,todo", label: "Active" },
  { value: "", label: "All" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
];

function TaskFilters({
  filter,
  onChange,
  search,
  onSearchChange,
}: {
  filter: TaskFilter;
  onChange: (f: TaskFilter) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "flex",
      gap: t.spaceSm,
      alignItems: "center",
      flexWrap: "wrap",
    }}>
      <div style={{ flex: "1 1 180px", minWidth: 140 }}>
        <SearchInput
          value={search}
          onSearch={(v) => { onSearchChange(v); onChange({ ...filter, title: v || undefined }); }}
          placeholder="Search tasks..."
          debounceMs={200}
        />
      </div>
      <div style={{ position: "relative" }}>
        <select
          value={filter.status ?? "in_progress,todo"}
          onChange={(e) => onChange({ ...filter, status: e.target.value || undefined })}
          aria-label="Filter by status"
          style={{
            appearance: "none",
            padding: `4px ${t.spaceLg} 4px ${t.spaceSm}`,
            borderRadius: t.radiusFull,
            border: `1px solid color-mix(in srgb, ${t.colorBorder} 60%, transparent)`,
            background: "transparent",
            color: t.colorTextMuted,
            fontSize: t.fontSizeXs,
            fontFamily: t.fontSans,
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
          }}
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <Icon name="expand_more" size={12} style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: t.colorTextMuted,
        }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task list
// ---------------------------------------------------------------------------

function TaskList({
  tasks,
  onSelect,
  onStatusChange,
  onDelete,
}: {
  tasks: TaskSummary[];
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (task: TaskSummary) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {tasks.map((task, i) => {
        const statusColor = STATUS_COLORS[task.status] ?? t.colorTextMuted;
        return (
          <div
            key={task.id}
            className="pd-task-row"
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
              animationDelay: `${Math.min(i * 20, 200)}ms`,
            }}
          >
            {/* Status dot */}
            <StatusDot color={statusColor} size={8} />

            {/* Status quick-toggle */}
            <select
              value={task.status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { e.stopPropagation(); onStatusChange(task.id, e.target.value as TaskStatus); }}
              aria-label={`Status for ${task.title}`}
              style={{
                appearance: "none",
                border: "none",
                background: "transparent",
                color: statusColor,
                fontSize: "0.6rem",
                fontFamily: t.fontMono,
                fontWeight: 700,
                textTransform: "uppercase",
                cursor: "pointer",
                width: 70,
                padding: 0,
                outline: "none",
                letterSpacing: "0.03em",
              }}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
            </select>

            {/* Title + summary */}
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <span style={{
                fontWeight: 600,
                fontSize: t.fontSizeSm,
                color: task.status === "done" ? t.colorTextMuted : t.colorText,
                textDecoration: task.status === "done" ? "line-through" : "none",
              }}>
                {task.title}
              </span>
              {task.summary && (
                <span style={{
                  marginLeft: t.spaceXs,
                  fontSize: t.fontSizeXs,
                  color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)`,
                }}>
                  — {task.summary}
                </span>
              )}
            </div>

            {/* Blocked badge */}
            {task.is_blocked && (
              <Badge variant="error">blocked</Badge>
            )}

            {/* Metadata pills */}
            {task.effort && (
              <span style={{
                padding: `1px ${t.spaceXs}`,
                borderRadius: t.radiusSm,
                background: `color-mix(in srgb, ${t.colorBorder} 40%, transparent)`,
                fontSize: "0.6rem",
                fontFamily: t.fontMono,
                color: t.colorTextMuted,
              }}>
                {task.effort}
              </span>
            )}
            {task.impact && (
              <span style={{
                padding: `1px ${t.spaceXs}`,
                borderRadius: t.radiusSm,
                background: `color-mix(in srgb, ${t.colorBorder} 40%, transparent)`,
                fontSize: "0.6rem",
                fontFamily: t.fontMono,
                color: t.colorTextMuted,
              }}>
                {task.impact}
              </span>
            )}

            {/* Group key */}
            {task.group_key && (
              <span style={{
                fontSize: "0.6rem",
                fontFamily: t.fontMono,
                color: `color-mix(in srgb, ${t.colorTextMuted} 60%, transparent)`,
                maxWidth: 80,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {task.group_key}
              </span>
            )}

            {/* Arrow hint */}
            <Icon
              name="chevron_right"
              size={14}
              className="pd-task-arrow"
              style={{ color: t.colorTextMuted, opacity: 0, transition: "opacity 0.15s", flexShrink: 0 }}
            />

            {/* Delete */}
            <IconButton
              icon="delete"
              size={14}
              aria-label={`Delete ${task.title}`}
              onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            />
          </div>
        );
      })}
    </div>
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
  onClose,
  onUpdate,
}: {
  task: TaskDetail;
  onClose: () => void;
  onUpdate: (taskId: string, input: Record<string, unknown>) => Promise<void>;
}) {
  const statusColor = STATUS_COLORS[task.status] ?? t.colorTextMuted;

  // Inline editing state
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function startEdit(field: string, current: string) {
    setEditField(field);
    setEditValue(current);
  }

  async function saveEdit(field: string) {
    const trimmed = editValue.trim();
    const sendValue = trimmed === "" ? null : trimmed;
    await onUpdate(task.id, { [field]: sendValue });
    setEditField(null);
  }

  function cancelEdit() {
    setEditField(null);
  }

  const toSelectOptions = (values: readonly string[], noneLabel = "—") => [
    { value: "", label: noneLabel },
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
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit("title"); if (e.key === "Escape") cancelEdit(); }}
                onBlur={() => saveEdit("title")}
                autoFocus
                style={{ fontSize: t.fontSizeLg, fontWeight: 700, fontFamily: t.fontSerif }}
              />
            ) : (
              <h2
                onClick={() => startEdit("title", task.title)}
                style={{
                  margin: 0,
                  fontSize: t.fontSizeLg,
                  fontWeight: 700,
                  fontFamily: t.fontSerif,
                  color: t.colorText,
                  cursor: "pointer",
                }}
                title="Click to edit"
              >
                {task.title}
              </h2>
            )}
          </div>
          <IconButton icon="close" size={18} onClick={onClose} aria-label="Close" />
        </div>

        {/* Metadata row */}
        <div style={{
          display: "flex",
          gap: t.spaceSm,
          flexWrap: "wrap",
          marginTop: t.spaceSm,
          alignItems: "center",
        }}>
          <MetaSelect
            label="Status"
            value={task.status}
            options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s }))}
            color={statusColor}
            onChange={(v) => onUpdate(task.id, { status: v })}
          />
          <MetaSelect
            label="Effort"
            value={task.effort ?? ""}
            options={toSelectOptions(EFFORT_LEVELS)}
            onChange={(v) => onUpdate(task.id, { effort: v || null })}
          />
          <MetaSelect
            label="Impact"
            value={task.impact ?? ""}
            options={toSelectOptions(IMPACT_LEVELS)}
            onChange={(v) => onUpdate(task.id, { impact: v || null })}
          />
          <MetaSelect
            label="Category"
            value={task.category ?? ""}
            options={toSelectOptions(TASK_CATEGORIES)}
            onChange={(v) => onUpdate(task.id, { category: v || null })}
          />
          {task.is_blocked && (
            <Badge variant="error">blocked</Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: t.spaceXl,
        display: "flex",
        flexDirection: "column",
        gap: t.spaceMd,
        scrollbarWidth: "none" as const,
        minWidth: 0,
        overflowWrap: "break-word",
        wordBreak: "break-word",
      }}>
        {/* Summary */}
        <TextSection
          label="Summary"
          content={task.summary}
          editing={editField === "summary"}
          editValue={editValue}
          onStartEdit={() => startEdit("summary", task.summary ?? "")}
          onEditChange={setEditValue}
          onSave={() => saveEdit("summary")}
          onCancel={cancelEdit}
        />

        {/* Context */}
        <TextSection
          label="Context"
          content={task.context}
          editing={editField === "context"}
          editValue={editValue}
          onStartEdit={() => startEdit("context", task.context ?? "")}
          onEditChange={setEditValue}
          onSave={() => saveEdit("context")}
          onCancel={cancelEdit}
        />

        {/* Acceptance Criteria */}
        <TextSection
          label="Acceptance Criteria"
          content={task.acceptance_criteria}
          editing={editField === "acceptance_criteria"}
          editValue={editValue}
          onStartEdit={() => startEdit("acceptance_criteria", task.acceptance_criteria ?? "")}
          onEditChange={setEditValue}
          onSave={() => saveEdit("acceptance_criteria")}
          onCancel={cancelEdit}
        />

        {/* Footer meta */}
        <div style={{
          marginTop: "auto",
          paddingTop: t.spaceMd,
          borderTop: `1px solid color-mix(in srgb, ${t.colorBorder} 30%, transparent)`,
          display: "flex",
          gap: t.spaceLg,
          fontSize: "0.65rem",
          fontFamily: t.fontMono,
          color: `color-mix(in srgb, ${t.colorTextMuted} 60%, transparent)`,
        }}>
          <span>ID: {task.id.slice(0, 8)}…</span>
          <span>Created: {formatRelativeDate(task.created_at)}</span>
          <span>Updated: {formatRelativeDate(task.updated_at)}</span>
        </div>
      </div>
    </ModalShell>
  );
}

/** Compact inline metadata select */
function MetaSelect({
  label,
  value,
  options,
  color,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  color?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: "0.6rem", fontFamily: t.fontMono, color: t.colorTextMuted, textTransform: "uppercase" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        style={{
          appearance: "none",
          border: "none",
          background: "transparent",
          color: color ?? t.colorTextSecondary,
          fontSize: t.fontSizeXs,
          fontFamily: t.fontSans,
          fontWeight: 600,
          cursor: "pointer",
          padding: `2px ${t.spaceXs}`,
          outline: "none",
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/** Editable text section with markdown preview */
function TextSection({
  label,
  content,
  editing,
  editValue,
  onStartEdit,
  onEditChange,
  onSave,
  onCancel,
}: {
  label: string;
  content: string | null;
  editing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm, marginBottom: t.spaceXs }}>
        <span style={{
          fontSize: t.fontSizeXs,
          fontWeight: 700,
          color: t.colorTextMuted,
          textTransform: "uppercase",
          letterSpacing: t.letterSpacingWide,
        }}>
          {label}
        </span>
        {!editing && (
          <IconButton icon="edit" size={12} onClick={onStartEdit} aria-label={`Edit ${label}`} />
        )}
      </div>
      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: t.spaceSm }}>
          <Textarea
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            autoFocus
            rows={4}
            placeholder={`${label}...`}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: t.spaceSm, justifyContent: "flex-end" }}>
            <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={onSave}>Save</Button>
          </div>
        </div>
      ) : content ? (
        <div
          onClick={onStartEdit}
          style={{
            cursor: "pointer",
            fontSize: t.fontSizeSm,
            lineHeight: t.lineHeightRelaxed,
            color: t.colorTextMuted,
            overflowWrap: "break-word",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            minWidth: 0,
          }}
          title="Click to edit"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {content}
          </ReactMarkdown>
        </div>
      ) : (
        <p
          onClick={onStartEdit}
          style={{
            margin: 0,
            fontSize: t.fontSizeSm,
            color: `color-mix(in srgb, ${t.colorTextMuted} 50%, transparent)`,
            fontStyle: "italic",
            cursor: "pointer",
          }}
        >
          No {label.toLowerCase()}. Click to add.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create task form
// ---------------------------------------------------------------------------

function CreateTaskForm({
  onCreate,
  onClose,
}: {
  onCreate: (input: { title: string; summary?: string; status?: string; effort?: string; impact?: string; category?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState("todo");

  return (
    <FormModal
      title="New Task"
      submitLabel="Create"
      onSubmit={async () => {
        if (!title.trim()) return;
        await onCreate({
          title: title.trim(),
          ...(summary.trim() ? { summary: summary.trim() } : {}),
          status,
        });
        onClose();
      }}
      onCancel={onClose}
      maxWidth={480}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: t.spaceMd }}>
        <Field label="Title" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
          />
        </Field>
        <Field label="Summary">
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief description (optional)"
            rows={3}
          />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </Select>
        </Field>
      </div>
    </FormModal>
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
// ProjectDetailPage
// ---------------------------------------------------------------------------

export function ProjectDetailPage({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  useInjectStyles(STYLES_ID, STYLES_CSS);
  const { showToast } = useToast();

  // Data
  const { project, notFound, loading: projectLoading, addTask, updateTask, deleteTask } = useProject(projectId);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>({ status: "in_progress,todo" });
  const [taskSearch, setTaskSearch] = useState("");
  const { tasks, total, totalPages, page, setPage, loading: tasksLoading } = useProjectTasks(projectId, taskFilter);

  // Compute status counts from all tasks (fetch separately for the progress bar)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!project) return;
    // Quick fetch with no filters to get totals
    import("../api").then(({ fetchTaskStatusCounts }) => {
      fetchTaskStatusCounts([projectId]).then((r) => {
        setStatusCounts(r[projectId]?.counts ?? {});
      }).catch(() => {});
    });
  }, [projectId, project, tasks]); // re-fetch when tasks change

  const allTaskTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // Task detail
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const { subscribeEvents } = useEventSubscription();
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

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskSummary | null>(null);

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    try {
      await updateTasks([{ id: taskId, status }]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update status");
    }
  }

  async function handleDeleteTask() {
    if (!deleteTarget) return;
    try {
      await deleteTask(deleteTarget.id);
      if (selectedTaskId === deleteTarget.id) setSelectedTaskId(null);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete task");
    }
  }

  // Loading / not found
  if (projectLoading && !project) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 900, alignSelf: "center", padding: `${t.space2xl} ${t.spaceXl}` }}>
        <Skeleton height={32} width="40%" />
        <div style={{ marginTop: t.spaceLg }}><Skeleton height={16} width="70%" /></div>
        <div style={{ marginTop: t.spaceXl, display: "flex", flexDirection: "column", gap: t.spaceSm }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={40} />)}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 900, alignSelf: "center", padding: `${t.space2xl} ${t.spaceXl}`, display: "flex", flexDirection: "column", alignItems: "center", gap: t.spaceMd }}>
        <Icon name="error" size={48} style={{ color: `color-mix(in srgb, ${t.colorTextMuted} 40%, transparent)` }} />
        <p style={{ margin: 0, fontSize: t.fontSizeSm, color: t.colorTextMuted }}>Project not found.</p>
        <Button size="sm" variant="ghost" onClick={onBack}>Back to projects</Button>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div style={{
      flex: 1,
      width: "100%",
      maxWidth: 900,
      alignSelf: "center",
      display: "flex",
      flexDirection: "column",
      padding: `${t.spaceLg} ${t.spaceXl} ${t.space2xl}`,
      boxSizing: "border-box",
      overflowY: "auto",
      scrollbarWidth: "none" as const,
      gap: t.spaceLg,
    }}>
      {/* Header */}
      <ProjectHeader
        title={project.title}
        summary={project.summary}
        context={project.context}
        requirements={project.requirements}
        taskTotal={allTaskTotal}
        statusCounts={statusCounts}
        onBack={onBack}
        onAddTask={() => setShowCreate(true)}
      />

      {/* Task filters */}
      <TaskFilters
        filter={taskFilter}
        onChange={setTaskFilter}
        search={taskSearch}
        onSearchChange={setTaskSearch}
      />

      {/* Task list */}
      {tasksLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={40} />)}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: t.spaceMd,
          padding: `${t.spaceXl} 0`,
        }}>
          <Icon name="checklist" size={40} style={{ color: `color-mix(in srgb, ${t.colorTextMuted} 35%, transparent)` }} />
          <p style={{ margin: 0, fontSize: t.fontSizeSm, color: t.colorTextMuted, textAlign: "center" }}>
            {taskFilter.status || taskFilter.title
              ? "No tasks match those filters."
              : "No tasks yet. Add one to get started."}
          </p>
          {!taskFilter.title && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Icon name="add" size={15} />
              Add Task
            </Button>
          )}
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          onSelect={setSelectedTaskId}
          onStatusChange={handleStatusChange}
          onDelete={setDeleteTarget}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={updateTask}
        />
      )}

      {/* Create task */}
      {showCreate && (
        <CreateTaskForm
          onCreate={async (fields) => {
            try {
              await addTask(fields);
              showToast("Task created", "success");
            } catch (err) {
              showToast(err instanceof ApiError ? err.message : "Failed to create task");
              throw err;
            }
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Task"
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          variant="destructive"
          confirmLabel="Delete"
          onConfirm={handleDeleteTask}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
