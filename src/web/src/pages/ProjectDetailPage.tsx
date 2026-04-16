/**
 * ProjectDetailPage — project "war room" dashboard.
 *
 * UI dependencies: @4lt7ab/ui only. No internal atoms/molecules/organisms.
 * Data dependencies: hooks (useProject, useProjectTasks) and api layer.
 *
 * Layout: back nav + title + progress bar, stat cards row, briefing panels,
 * then a table-based task list with filters and pagination.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { semantic as t, useInjectStyles, KEYFRAMES } from "@4lt7ab/ui/core";
import {
  Button,
  Card,
  IconButton,
  Icon,
  Badge,
  StatusDot,
  ProgressBar,
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
  RowSkeleton,
  SegmentedControl,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableEmptyRow,
  EmptyState,
  SectionLabel,
  MetadataTable,
  Grid,
  StatCard,
  TabStrip,
  useToast,
} from "@4lt7ab/ui/ui";
import { Markdown } from "@4lt7ab/ui/content";

import { useProject } from "../hooks/useProject";
import { useProjectTasks } from "../hooks/useProjectTasks";
import type { TaskFilter } from "../hooks/useProjectTasks";
import { useEventSubscription } from "../hooks/useEventSubscription";
import { useThrottledCallback } from "../hooks/useThrottledCallback";
import { ApiError, fetchTask, updateTasks, fetchTaskStatusCounts } from "../api";
import type { TaskDetail } from "../api";
import { TASK_STATUSES, EFFORT_LEVELS, IMPACT_LEVELS, TASK_CATEGORIES } from "../types";
import type { TaskSummary, TaskStatus } from "../types";
import { PillSelect } from "../components/PillSelect";
import { formatRelativeDate, staggerStyle } from "../utils";
import { MetaPill } from "../components/MetaPill";
import { useInlineEdit } from "../hooks/useInlineEdit";
import { TextSection } from "@4lt7ab/ui/content";
import { STATUS_VARIANTS, STATUS_CSS_COLORS, STATUS_LABELS, CATEGORY_ICONS } from "../constants/task";
import { PageShell } from "../components/PageShell";
import { TaskStatusSelect } from "../components/TaskStatusSelect";

// ---------------------------------------------------------------------------
// Injected styles
// ---------------------------------------------------------------------------

const STYLES_ID = "project-detail-styles";
const STYLES_CSS = `
  @media (prefers-reduced-motion: reduce) {
    .pd-stat-card, .pd-task-row { transition: none !important; animation: none !important; }
  }
`;

// ---------------------------------------------------------------------------
// Constants (STATUS_CSS_COLORS, STATUS_LABELS, CATEGORY_ICONS from ../constants/task)
// ---------------------------------------------------------------------------

const TABLE_COLUMNS = 7; // status, title, category, effort, impact, updated, actions

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// MetaPill imported from ../components/MetaPill

// ---------------------------------------------------------------------------
// Stat cards — task status breakdown
// ---------------------------------------------------------------------------

interface StatCardDef {
  label: string;
  statusKey: string;
  color: "muted" | "warning" | "success" | "error";
}

const STAT_CARD_DEFS: StatCardDef[] = [
  { label: "To Do", statusKey: "todo", color: "muted" },
  { label: "In Progress", statusKey: "in_progress", color: "warning" },
  { label: "Done", statusKey: "done", color: "success" },
  { label: "Blocked", statusKey: "blocked", color: "error" },
];

function StatusStatCards({
  statusCounts,
  blockedCount,
  loading,
}: {
  statusCounts: Record<string, number>;
  blockedCount: number;
  loading: boolean;
}) {
  return (
    <Grid minColumnWidth={140} gap="sm">
      {STAT_CARD_DEFS.map((def, i) => {
        if (loading) return <Skeleton key={def.statusKey} height={64} />;
        const value = def.statusKey === "blocked" ? blockedCount : (statusCounts[def.statusKey] ?? 0);
        return (
          <div key={def.statusKey} style={staggerStyle(i, { delayMs: 50, duration: 0.25 })}>
            <StatCard
              color={def.color}
              value={value}
              label={def.label}
              iconSize={32}
            />
          </div>
        );
      })}
    </Grid>
  );
}

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
  blockedCount,
  onBack,
  onAddTask,
  statusLoading,
}: {
  title: string;
  summary: string | null;
  context: string | null;
  requirements: string | null;
  taskTotal: number;
  statusCounts: Record<string, number>;
  blockedCount: number;
  onBack: () => void;
  onAddTask: () => void;
  statusLoading: boolean;
}) {
  const done = statusCounts["done"] ?? 0;
  const pct = taskTotal > 0 ? Math.round((done / taskTotal) * 100) : 0;
  const inProgress = statusCounts["in_progress"] ?? 0;
  const todo = statusCounts["todo"] ?? 0;

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
                { value: done, color: "success" as const, label: "done" },
                { value: inProgress, color: "warning" as const, label: "in progress" },
                { value: todo, color: "muted" as const, label: "to do" },
                { value: (statusCounts["archived"] ?? 0), color: "muted" as const, label: "archived" },
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

      {/* Status stat cards */}
      <StatusStatCards statusCounts={statusCounts} blockedCount={blockedCount} loading={statusLoading} />

      {/* Briefing panels — collapsible tabs for summary/context/requirements */}
      {panels.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <TabStrip
            tabs={panels.map((p) => ({ key: p.key, label: p.label, icon: p.icon }))}
            activeKey={expandedPanel}
            onChange={setExpandedPanel}
            allowDeselect
            size="sm"
          />

          {/* Expanded content */}
          {expandedPanel && (() => {
            const panel = panels.find((p) => p.key === expandedPanel);
            if (!panel) return null;
            return (
              <div style={{
                padding: `${t.spaceMd} ${t.spaceMd} ${t.spaceMd}`,
                borderLeft: `2px solid color-mix(in srgb, ${t.colorActionPrimary} 15%, transparent)`,
                marginLeft: t.spaceSm,
                animation: `${KEYFRAMES.fadeInUp} 0.2s ease both`,
              }}>
                <Markdown style={{ fontSize: t.fontSizeSm }}>
                  {panel.content}
                </Markdown>
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
      <PillSelect
        value={filter.status ?? "in_progress,todo"}
        options={STATUS_FILTER_OPTIONS}
        onChange={(v) => onChange({ ...filter, status: v || undefined })}
        ariaLabel="Filter by status"
        active={false}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task table
// ---------------------------------------------------------------------------

function TaskTableView({
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
    <Table variant="default" density="sm" style={{ background: t.colorSurfaceSolid, flexShrink: 0 }}>
      <TableHeader>
        <TableHeaderCell width={130}>Status</TableHeaderCell>
        <TableHeaderCell>Title</TableHeaderCell>
        <TableHeaderCell width={90}>Category</TableHeaderCell>
        <TableHeaderCell width={70}>Effort</TableHeaderCell>
        <TableHeaderCell width={70}>Impact</TableHeaderCell>
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
            const statusColor = STATUS_CSS_COLORS[task.status] ?? t.colorTextMuted;
            return (
              <TableRow
                key={task.id}
                hoverable
                onClick={() => onSelect(task.id)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(task.id); } }}
                style={{
                  ...staggerStyle(i, { delayMs: 20, maxMs: 200, duration: 0.25 }),
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

                {/* Title + summary */}
                <TableCell truncate>
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
// Task detail modal
// ---------------------------------------------------------------------------

function TaskDetailModal({
  task,
  onClose,
  onUpdate,
}: {
  task: TaskDetail;
  onClose: () => void;
  onUpdate: (taskId: string, input: Record<string, unknown>) => Promise<void>;
}) {
  const statusColor = STATUS_CSS_COLORS[task.status] ?? t.colorTextMuted;
  const { editField, editValue, startEdit, saveEdit, cancelEdit, setEditValue } =
    useInlineEdit(async (patch) => onUpdate(task.id, patch));

  const toSelectOptions = (values: readonly string[], noneLabel = "\u2014") => [
    { value: "", label: noneLabel },
    ...values.map((v) => ({ value: v, label: v.replace(/_/g, " ") })),
  ];

  // Metadata items for MetadataTable
  const metadataItems = useMemo(() => {
    const items: { label: string; value: React.ReactNode }[] = [];
    items.push({
      label: "ID",
      value: <span style={{ fontFamily: t.fontMono, fontSize: t.fontSizeXs }}>{task.id.slice(0, 8)}...</span>,
    });
    if (task.category) {
      items.push({
        label: "Category",
        value: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name={CATEGORY_ICONS[task.category] ?? "label"} size={12} />
            {task.category}
          </span>
        ),
      });
    }
    if (task.effort) {
      items.push({ label: "Effort", value: task.effort });
    }
    if (task.impact) {
      items.push({ label: "Impact", value: task.impact });
    }
    if (task.group_key) {
      items.push({ label: "Group", value: <span style={{ fontFamily: t.fontMono, fontSize: t.fontSizeXs }}>{task.group_key}</span> });
    }
    items.push({
      label: "Created",
      value: <span style={{ fontFamily: t.fontMono, fontSize: t.fontSizeXs }}>{formatRelativeDate(task.created_at)}</span>,
    });
    items.push({
      label: "Updated",
      value: <span style={{ fontFamily: t.fontMono, fontSize: t.fontSizeXs }}>{formatRelativeDate(task.updated_at)}</span>,
    });
    return items;
  }, [task]);

  return (
    <ModalShell onClose={onClose} maxWidth={680}>
      {/* Header */}
      <div style={{
        padding: `${t.spaceLg} ${t.spaceXl}`,
        borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 30%, transparent)`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: t.spaceSm }}>
          <div style={{ marginTop: 8 }}>
            <StatusDot variant={STATUS_VARIANTS[task.status] ?? "muted"} size="lg" animate={task.status === "in_progress" ? "pulse" : "none"} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editField === "title" ? (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveEdit("title"); if (e.key === "Escape") cancelEdit(); }}
                onBlur={() => saveEdit("title")}
                autoFocus
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

        {/* Metadata selects row */}
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
        <SectionLabel>Summary</SectionLabel>
        <TextSection
          content={task.summary}
          editing={editField === "summary"}
          editValue={editValue}
          onStartEdit={() => startEdit("summary", task.summary ?? "")}
          onEditChange={setEditValue}
          onSave={() => saveEdit("summary")}
          onCancel={cancelEdit}
          fieldLabel="Summary"
        />

        {/* Context */}
        <SectionLabel>Context</SectionLabel>
        <TextSection
          content={task.context}
          editing={editField === "context"}
          editValue={editValue}
          onStartEdit={() => startEdit("context", task.context ?? "")}
          onEditChange={setEditValue}
          onSave={() => saveEdit("context")}
          onCancel={cancelEdit}
          fieldLabel="Context"
        />

        {/* Acceptance Criteria */}
        <SectionLabel>Acceptance Criteria</SectionLabel>
        <TextSection
          content={task.acceptance_criteria}
          editing={editField === "acceptance_criteria"}
          editValue={editValue}
          onStartEdit={() => startEdit("acceptance_criteria", task.acceptance_criteria ?? "")}
          onEditChange={setEditValue}
          onSave={() => saveEdit("acceptance_criteria")}
          onCancel={cancelEdit}
          fieldLabel="Acceptance Criteria"
        />

        {/* Metadata table */}
        <SectionLabel>Details</SectionLabel>
        <MetadataTable items={metadataItems} />
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

// TextSection imported from ../components/TextSection

// ---------------------------------------------------------------------------
// Create task form (richer — includes category, effort, impact)
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
  const [category, setCategory] = useState("");
  const [effort, setEffort] = useState("");
  const [impact, setImpact] = useState("");

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
          ...(category ? { category } : {}),
          ...(effort ? { effort } : {}),
          ...(impact ? { impact } : {}),
        });
        onClose();
      }}
      onCancel={onClose}
      maxWidth={520}
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: t.spaceMd }}>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">None</option>
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: t.spaceMd }}>
          <Field label="Effort">
            <Select value={effort} onChange={(e) => setEffort(e.target.value)}>
              <option value="">None</option>
              {EFFORT_LEVELS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </Select>
          </Field>
          <Field label="Impact">
            <Select value={impact} onChange={(e) => setImpact(e.target.value)}>
              <option value="">None</option>
              {IMPACT_LEVELS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </FormModal>
  );
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
  const [statusCountsLoading, setStatusCountsLoading] = useState(true);
  useEffect(() => {
    if (!project) return;
    setStatusCountsLoading(true);
    fetchTaskStatusCounts([projectId]).then((r) => {
      setStatusCounts(r[projectId]?.counts ?? {});
    }).catch(() => {}).finally(() => setStatusCountsLoading(false));
  }, [projectId, project, tasks]); // re-fetch when tasks change

  const allTaskTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // Derive blocked count from tasks (is_blocked field)
  // We count blocked from the statusCounts if available, otherwise from filtered tasks
  const blockedCount = useMemo(() => {
    // is_blocked is a user-managed field, not a status. We need to count from tasks.
    // Since we only have the current page of tasks, we use a simple heuristic:
    // fetch blocked count via a lightweight query. For now, just count from visible tasks
    // and the statusCounts won't have "blocked" as a status key.
    return tasks.filter((t) => t.is_blocked).length;
  }, [tasks]);

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
      <div style={{ flex: 1, width: "100%", maxWidth: 960, alignSelf: "center", padding: `${t.space2xl} ${t.spaceXl}` }}>
        <Skeleton height={32} width="40%" />
        <div style={{ marginTop: t.spaceLg }}><Skeleton height={16} width="70%" /></div>
        <div style={{ marginTop: t.spaceMd, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: t.spaceSm }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={64} />)}
        </div>
        <div style={{ marginTop: t.spaceXl, display: "flex", flexDirection: "column", gap: 1 }}>
          {Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 960, alignSelf: "center", padding: `${t.space2xl} ${t.spaceXl}`, display: "flex", flexDirection: "column", alignItems: "center", gap: t.spaceMd }}>
        <EmptyState icon="error" message="Project not found." />
        <Button size="sm" variant="ghost" onClick={onBack}>Back to projects</Button>
      </div>
    );
  }

  if (!project) return null;

  return (
    <PageShell maxWidth={960}>
      {/* Header with progress, stat cards, and briefing panels */}
      <ProjectHeader
        title={project.title}
        summary={project.summary}
        context={project.context}
        requirements={project.requirements}
        taskTotal={allTaskTotal}
        statusCounts={statusCounts}
        blockedCount={blockedCount}
        onBack={onBack}
        onAddTask={() => setShowCreate(true)}
        statusLoading={statusCountsLoading && Object.keys(statusCounts).length === 0}
      />

      {/* Tasks section */}
      <SectionLabel>
        <span style={{ display: "inline-flex", alignItems: "center", gap: t.spaceXs }}>
          <Icon name="checklist" size={14} />
          Tasks
          {total > 0 && (
            <span style={{ marginLeft: t.spaceXs }}><Badge variant="default">{total}</Badge></span>
          )}
        </span>
      </SectionLabel>

      {/* Task filters */}
      <TaskFilters
        filter={taskFilter}
        onChange={setTaskFilter}
        search={taskSearch}
        onSearchChange={setTaskSearch}
      />

      {/* Task table */}
      {tasksLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={taskFilter.status || taskFilter.title ? "search_off" : "checklist"}
          message={
            taskFilter.status || taskFilter.title
              ? "No tasks match those filters."
              : "No tasks yet. Add one to get started."
          }
          action={!taskFilter.title ? (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Icon name="add" size={15} />
              Add Task
            </Button>
          ) : undefined}
        />
      ) : (
        <TaskTableView
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
    </PageShell>
  );
}
