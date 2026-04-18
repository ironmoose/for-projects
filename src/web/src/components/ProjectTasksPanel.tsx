/**
 * ProjectTasksPanel — presentational task panel for ProjectDetailPage.
 *
 * Owns no data fetching. Receives tasks + filter state + modal state as props
 * from the parent page and renders filters, table, pagination, and the three
 * task modals (detail, create, delete confirm).
 *
 * UI dependencies: @4lt7ab/ui only. Inline styles via semantic tokens.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { semantic as t, KEYFRAMES } from "@4lt7ab/ui/core";
import {
  Button,
  Icon,
  IconButton,
  Badge,
  StatusDot,
  SearchInput,
  Input,
  Textarea,
  Select,
  Field,
  Pagination,
  ConfirmDialog,
  FormModal,
  ModalShell,
  RowSkeleton,
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
  useToast,
} from "@4lt7ab/ui/ui";
import { TextSection } from "@4lt7ab/ui/content";

import type { TaskFilter } from "../hooks/useProjectTasks";
import { useEventSubscription } from "../hooks/useEventSubscription";
import { useThrottledCallback } from "../hooks/useThrottledCallback";
import { ApiError, fetchTask, updateTasks } from "../api";
import type { TaskDetail } from "../api";
import { TASK_STATUSES, EFFORT_LEVELS, IMPACT_LEVELS, TASK_CATEGORIES } from "../types";
import type { TaskSummary, TaskStatus } from "../types";
import { PillSelect } from "./PillSelect";
import { formatRelativeDate, staggerStyle } from "../utils";
import { MetaPill } from "./MetaPill";
import { useInlineEdit } from "../hooks/useInlineEdit";
import { STATUS_VARIANTS, STATUS_CSS_COLORS, STATUS_LABELS, CATEGORY_ICONS } from "../constants/task";
import { SolidModalBody } from "./SolidModalBody";
import { TaskStatusSelect } from "./TaskStatusSelect";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABLE_COLUMNS = 7; // status, title, category, effort, impact, updated, actions

const STATUS_FILTER_OPTIONS = [
  { value: "in_progress,todo", label: "Active" },
  { value: "", label: "All" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
];

// ---------------------------------------------------------------------------
// Task filters
// ---------------------------------------------------------------------------

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
      <SolidModalBody layout="pinned">
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

        <SectionLabel>Details</SectionLabel>
        <MetadataTable items={metadataItems} />
      </div>
      </SolidModalBody>
    </ModalShell>
  );
}

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
// ProjectTasksPanel — public component
// ---------------------------------------------------------------------------

export interface ProjectTasksPanelProps {
  /** ID of the active project — used for task create flow. */
  projectId: string;
  /** Total number of tasks shown in the header badge (from useProjectTasks). */
  total: number;
  /** Current page of tasks. */
  tasks: TaskSummary[];
  /** Pagination state. */
  totalPages: number;
  page: number;
  setPage: (p: number) => void;
  /** Whether tasks are still loading. */
  tasksLoading: boolean;
  /** Filter state (lifted to parent so the header can react if needed). */
  taskFilter: TaskFilter;
  setTaskFilter: (f: TaskFilter) => void;
  taskSearch: string;
  setTaskSearch: (v: string) => void;
  /** Create-modal visibility (toggled by the parent's Add Task button). */
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  /** Mutations — delegated from useProject. */
  addTask: (input: {
    title: string;
    summary?: string;
    context?: string;
    acceptance_criteria?: string;
    group_key?: string;
    status?: string;
    effort?: string;
    impact?: string;
    category?: string;
  }) => Promise<void>;
  updateTask: (taskId: string, input: Record<string, string | null | undefined>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

export function ProjectTasksPanel({
  projectId,
  total,
  tasks,
  totalPages,
  page,
  setPage,
  tasksLoading,
  taskFilter,
  setTaskFilter,
  taskSearch,
  setTaskSearch,
  showCreate,
  setShowCreate,
  addTask,
  updateTask,
  deleteTask,
}: ProjectTasksPanelProps) {
  const { showToast } = useToast();

  // Selected task + modal fetching
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskSummary | null>(null);
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

  // Reset selection when switching projects (guards against stale IDs).
  useEffect(() => {
    setSelectedTaskId(null);
    setDeleteTarget(null);
  }, [projectId]);

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

  return (
    <>
      <SectionLabel>
        <span style={{ display: "inline-flex", alignItems: "center", gap: t.spaceXs }}>
          <Icon name="checklist" size={14} />
          Tasks
          {total > 0 && (
            <span style={{ marginLeft: t.spaceXs }}><Badge variant="default">{total}</Badge></span>
          )}
        </span>
      </SectionLabel>

      <TaskFilters
        filter={taskFilter}
        onChange={setTaskFilter}
        search={taskSearch}
        onSearchChange={setTaskSearch}
      />

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

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={updateTask}
        />
      )}

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
    </>
  );
}
