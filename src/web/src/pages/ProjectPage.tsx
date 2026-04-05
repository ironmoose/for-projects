import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Icon,
  IconButton,
  Input,
  Select,
  SectionLabel,
  Textarea,
  Stack,
  useTheme,
  DetailPageLayout,
  BackButton,
  ExpandableCard,
  MetadataTable,
  EmptyState,
  ConfirmDialog,
  Pagination,
  TaskTable,
  TaskTableFilters,
  DocumentReaderModal,
  DependencyChip,
  DependencyGraphView,
} from "../components";
import { DocumentReferenceSection } from "../components/organisms/DocumentReferenceSection";
import { DocumentReferencePicker } from "../components/organisms/DocumentReferencePicker";
import { CreateTaskOverlay } from "../components/organisms/CreateTaskOverlay";
import { ModalShell } from "../components/organisms/ModalShell";
import { Badge } from "../components/atoms/Badge";
import { useProject } from "../hooks";
import { useShortcut, useShortcutSuppression } from "../hooks/useKeyboardShortcuts";
import { useWindowWidth } from "../hooks/useWindowWidth";
import { useProjectTasks } from "../hooks/useProjectTasks";
import type { TaskFilter } from "../hooks/useProjectTasks";
import { useDependencyGraph } from "../hooks/useDependencyGraph";
import { useEventSubscription } from "../hooks/useEventSubscription";
import { useThrottledCallback } from "../hooks/useThrottledCallback";
import { useToastContext } from "../components/ToastContext";
import { ApiError, fetchTask, updateTasks, fetchTaskDependencies, fetchTasks, addDependency, removeDependency, removeDependencyBothDirections } from "../api";
import type { TaskDetail, TaskDependencies, DependencyDetail, DocumentsMergePatch } from "../api";
import type { TaskSummary, TaskStatus, DocumentReferenceDetail, ReferenceType } from "../types";
import { TASK_STATUSES, EFFORT_LEVELS, IMPACT_LEVELS, TASK_CATEGORIES, REFERENCE_TYPES } from "../types";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const graphStatusFilterOptions = [
  { value: "in_progress,todo", label: "Active" },
  { value: "", label: "All statuses" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
];

/** Types always shown even when empty */
const ALWAYS_SHOWN_TYPES: ReferenceType[] = ["goal", "plan", "requirements", "design"];

// ---------------------------------------------------------------------------
// AddDependencySearch — inline search to add a dependency
// ---------------------------------------------------------------------------

function AddDependencySearch({
  projectId,
  currentTaskId,
  existingIds,
  dependencyType,
  onAdd,
  onClose,
}: {
  projectId: string;
  currentTaskId: string;
  existingIds: Set<string>;
  dependencyType: "blocks" | "relates_to";
  onAdd: (targetTaskId: string) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTasks({ project_id: projectId, title: query.trim(), limit: 20 })
      .then(({ data }) => {
        if (cancelled) return;
        setResults(data.filter((t) => t.id !== currentTaskId && !existingIds.has(t.id)));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Search failed");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, projectId, currentTaskId, existingIds]);

  return (
    <div style={{ marginTop: theme.spacing.xs }}>
      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tasks by title..."
        style={{ fontSize: theme.font.size.xs, padding: "4px 8px" }}
      />
      {error && (
        <p style={{ margin: `${theme.spacing.xs} 0 0`, fontSize: theme.font.size.xxs, color: theme.color.danger }}>
          {error}
        </p>
      )}
      {loading && (
        <p style={{ margin: `${theme.spacing.xs} 0 0`, fontSize: theme.font.size.xxs, color: theme.color.textFaint }}>
          Searching...
        </p>
      )}
      {!loading && query.trim() && results.length === 0 && !error && (
        <p style={{ margin: `${theme.spacing.xs} 0 0`, fontSize: theme.font.size.xxs, color: theme.color.textFaint }}>
          No matching tasks
        </p>
      )}
      {results.length > 0 && (
        <div
          style={{
            marginTop: theme.spacing.xs,
            border: `1px solid ${theme.color.borderSubtle}`,
            borderRadius: theme.radius.md,
            background: theme.color.surfaceContainer,
            maxHeight: 150,
            overflowY: "auto",
          }}
        >
          {results.map((t) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onAdd(t.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onAdd(t.id); }}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                fontSize: theme.font.size.xs,
                color: theme.color.text,
                cursor: "pointer",
                borderBottom: `1px solid ${theme.color.borderSubtle}`,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = theme.color.surfaceContainerHigh; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <Badge variant={statusBadgeVariant(t.status)} style={{ marginRight: theme.spacing.xs }}>
                {STATUS_LABELS[t.status] ?? t.status}
              </Badge>
              {t.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DependencySection — renders one section (Blocked By / Blocks / Related)
// ---------------------------------------------------------------------------

type DependencySectionType = "blocked_by" | "blocks" | "relates_to";

function DependencySection({
  title,
  items,
  section,
  projectId,
  currentTaskId,
  allExistingIds,
  onSelectTask,
  onRemove,
  onAdd,
}: {
  title: string;
  items: DependencyDetail[];
  section: DependencySectionType;
  projectId: string;
  currentTaskId: string;
  allExistingIds: Set<string>;
  onSelectTask: (id: string) => void;
  onRemove: (item: DependencyDetail, section: DependencySectionType) => void;
  onAdd: (targetTaskId: string, section: DependencySectionType) => void;
}) {
  const { theme } = useTheme();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div style={{ marginBottom: theme.spacing.md }}>
      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.xs }}>
        <span
          style={{
            fontSize: theme.font.size.xxs,
            fontWeight: 700,
            color: theme.color.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {title}
        </span>
        {items.length > 0 && (
          <span
            style={{
              fontSize: theme.font.size.xxs,
              fontWeight: 700,
              color: theme.color.textFaint,
              background: theme.color.surfaceContainerHigh,
              borderRadius: theme.radius.full,
              padding: "1px 6px",
              lineHeight: 1.4,
            }}
          >
            {items.length}
          </span>
        )}
      </div>
      {items.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.xs }}>
          {items.map((dep) => (
            <DependencyChip
              key={dep.task_id}
              taskId={dep.task_id}
              taskTitle={dep.task_title}
              taskStatus={dep.task_status}
              dependencyType={dep.dependency_type}
              onClick={() => onSelectTask(dep.task_id)}
              onRemove={() => onRemove(dep, section)}
            />
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: theme.font.size.xs, color: theme.color.textFaint, fontStyle: "italic" }}>
          None
        </p>
      )}
      {showAdd ? (
        <AddDependencySearch
          projectId={projectId}
          currentTaskId={currentTaskId}
          existingIds={allExistingIds}
          dependencyType={section === "relates_to" ? "relates_to" : "blocks"}
          onAdd={(targetId) => { onAdd(targetId, section); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            marginTop: theme.spacing.xs,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: theme.font.size.xxs,
            color: theme.color.primary,
            fontWeight: 600,
            fontFamily: theme.font.body,
          }}
        >
          + Add
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskDetailPanel
// ---------------------------------------------------------------------------

function toSelectOptions(
  values: readonly string[],
  noneLabel = "-- none --",
): { value: string; label: string }[] {
  return [
    { value: "", label: noneLabel },
    ...values.map((v) => ({
      value: v,
      label: v.replace(/_/g, " "),
    })),
  ];
}

const DETAIL_STATUS_OPTIONS = TASK_STATUSES.map((v) => ({ value: v, label: v.replace(/_/g, " ") }));
const DETAIL_EFFORT_OPTIONS = toSelectOptions(EFFORT_LEVELS);
const DETAIL_IMPACT_OPTIONS = toSelectOptions(IMPACT_LEVELS);
const DETAIL_CATEGORY_OPTIONS = toSelectOptions(TASK_CATEGORIES);

function MetadataField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
      <label
        style={{
          fontSize: theme.font.size.xs,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: theme.color.textFaint,
          fontFamily: theme.font.body,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function TaskDetailPanel({
  task,
  onClose,
  onUpdate,
  taskTitles,
}: {
  task: TaskDetail;
  onClose: () => void;
  onUpdate: (taskId: string, input: Record<string, unknown>) => Promise<void>;
  taskTitles: Map<string, string>;
}) {
  const { theme } = useTheme();

  // Title editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);

  // Summary editing state
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryValue, setSummaryValue] = useState(task.summary ?? "");

  // Group key editing state
  const [editingGroupKey, setEditingGroupKey] = useState(false);
  const [groupKeyValue, setGroupKeyValue] = useState(task.group_key ?? "");

  // Suppress keyboard shortcuts while detail panel is open
  useShortcutSuppression();

  const { showToast } = useToastContext();

  // Structured dependency state
  const [dependencies, setDependencies] = useState<TaskDependencies | null>(null);
  const [depsLoading, setDepsLoading] = useState(false);
  const blockedByRef = useRef<HTMLDivElement>(null);

  const loadDependencies = useCallback(() => {
    setDepsLoading(true);
    fetchTaskDependencies(task.id)
      .then(setDependencies)
      .catch(() => { setDependencies(null); })
      .finally(() => setDepsLoading(false));
  }, [task.id]);

  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  const allExistingIds = useMemo(() => {
    if (!dependencies) return new Set<string>();
    const ids = new Set<string>();
    for (const d of dependencies.blocks) ids.add(d.task_id);
    for (const d of dependencies.blocked_by) ids.add(d.task_id);
    for (const d of dependencies.relates_to) ids.add(d.task_id);
    return ids;
  }, [dependencies]);

  const handleRemoveDependency = useCallback(async (dep: DependencyDetail, section: DependencySectionType) => {
    try {
      if (section === "blocked_by") {
        await removeDependency(task.project_id, dep.task_id, task.id);
      } else if (section === "blocks") {
        await removeDependency(task.project_id, task.id, dep.task_id);
      } else {
        await removeDependencyBothDirections(task.project_id, task.id, dep.task_id);
      }
      loadDependencies();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to remove dependency");
    }
  }, [task.id, task.project_id, loadDependencies, showToast]);

  const handleAddDependency = useCallback(async (targetTaskId: string, section: DependencySectionType) => {
    try {
      if (section === "blocked_by") {
        await addDependency(task.project_id, targetTaskId, task.id, "blocks");
      } else if (section === "blocks") {
        await addDependency(task.project_id, task.id, targetTaskId, "blocks");
      } else {
        await addDependency(task.project_id, task.id, targetTaskId, "relates_to");
      }
      loadDependencies();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add dependency");
    }
  }, [task.id, task.project_id, loadDependencies, showToast]);

  // Sync state when task prop changes
  useEffect(() => {
    if (!editingTitle) setTitleValue(task.title);
  }, [task.title, editingTitle]);

  useEffect(() => {
    if (!editingSummary) setSummaryValue(task.summary ?? "");
  }, [task.summary, editingSummary]);

  useEffect(() => {
    if (!editingGroupKey) setGroupKeyValue(task.group_key ?? "");
  }, [task.group_key, editingGroupKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingTitle) { setEditingTitle(false); setTitleValue(task.title); return; }
        if (editingSummary) { setEditingSummary(false); setSummaryValue(task.summary ?? ""); return; }
        if (editingGroupKey) { setEditingGroupKey(false); setGroupKeyValue(task.group_key ?? ""); return; }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, editingTitle, editingSummary, editingGroupKey, task.title, task.summary, task.group_key]);

  // --- Metadata save handlers ---
  async function handleMetadataChange(field: string, value: string) {
    const sendValue = value === "" ? null : value;
    await onUpdate(task.id, { [field]: sendValue });
  }

  async function handleTitleSave() {
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed === task.title) {
      setEditingTitle(false);
      setTitleValue(task.title);
      return;
    }
    await onUpdate(task.id, { title: trimmed });
    setEditingTitle(false);
  }

  async function handleSummarySave() {
    const trimmed = summaryValue.trim();
    const sendValue = trimmed === "" ? null : trimmed;
    if (sendValue === (task.summary ?? null)) {
      setEditingSummary(false);
      return;
    }
    await onUpdate(task.id, { summary: sendValue });
    setEditingSummary(false);
  }

  async function handleGroupKeySave() {
    const trimmed = groupKeyValue.trim();
    const sendValue = trimmed === "" ? null : trimmed;
    if (sendValue === (task.group_key ?? null)) {
      setEditingGroupKey(false);
      return;
    }
    await onUpdate(task.id, { group_key: sendValue });
    setEditingGroupKey(false);
  }

  return (
    <ModalShell
      onClose={onClose}
      maxWidth={1000}
      maxHeight="75vh"
      handleEscape={false}
      style={{ gap: 0, padding: 0, minHeight: "50vh" }}
    >
      {/* Header -- editable title */}
      <div
        style={{
          padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`,
          borderBottom: `1px solid ${theme.color.borderSubtle}`,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" justify="space-between" align="flex-start" gap="sm">
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingTitle ? (
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleTitleSave(); }
                  if (e.key === "Escape") { e.stopPropagation(); setEditingTitle(false); setTitleValue(task.title); }
                }}
                onBlur={handleTitleSave}
                autoFocus
                style={{
                  fontFamily: theme.font.headline,
                  fontSize: theme.font.size.xl,
                  fontWeight: 800,
                  letterSpacing: theme.font.letterSpacing.tight,
                }}
              />
            ) : (
              <h2
                onClick={() => setEditingTitle(true)}
                style={{
                  margin: 0,
                  fontFamily: theme.font.headline,
                  fontSize: theme.font.size.xl,
                  fontWeight: 800,
                  letterSpacing: theme.font.letterSpacing.tight,
                  color: theme.color.text,
                  lineHeight: 1.3,
                  cursor: "pointer",
                }}
                title="Click to edit title"
              >
                {task.title}
              </h2>
            )}
          </div>
          <IconButton icon="close" size={18} onClick={onClose} aria-label="Close detail panel" />
        </Stack>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: theme.spacing.xl,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Metadata -- inline editable selects */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <MetadataField label="Status">
            <Select
              options={DETAIL_STATUS_OPTIONS}
              value={task.status}
              onChange={(e) => handleMetadataChange("status", e.target.value)}
            />
          </MetadataField>
          <MetadataField label="Effort">
            <Select
              options={DETAIL_EFFORT_OPTIONS}
              value={task.effort ?? ""}
              onChange={(e) => handleMetadataChange("effort", e.target.value)}
            />
          </MetadataField>
          <MetadataField label="Impact">
            <Select
              options={DETAIL_IMPACT_OPTIONS}
              value={task.impact ?? ""}
              onChange={(e) => handleMetadataChange("impact", e.target.value)}
            />
          </MetadataField>
          <MetadataField label="Category">
            <Select
              options={DETAIL_CATEGORY_OPTIONS}
              value={task.category ?? ""}
              onChange={(e) => handleMetadataChange("category", e.target.value)}
            />
          </MetadataField>
        </div>

        {/* Group key -- editable */}
        <div style={{ marginBottom: theme.spacing.lg }}>
          <MetadataField label="Group Key">
            {editingGroupKey ? (
              <Input
                value={groupKeyValue}
                onChange={(e) => setGroupKeyValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleGroupKeySave(); }
                  if (e.key === "Escape") { e.stopPropagation(); setEditingGroupKey(false); setGroupKeyValue(task.group_key ?? ""); }
                }}
                onBlur={handleGroupKeySave}
                autoFocus
                placeholder="e.g. ui-crud-completeness"
              />
            ) : (
              <span
                onClick={() => setEditingGroupKey(true)}
                style={{
                  fontSize: theme.font.size.sm,
                  color: task.group_key ? theme.color.text : theme.color.textFaint,
                  fontStyle: task.group_key ? "normal" : "italic",
                  cursor: "pointer",
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.radius.lg,
                  border: `1px solid transparent`,
                  display: "inline-block",
                }}
                title="Click to edit group key"
              >
                {task.group_key ?? "No group key"}
              </span>
            )}
          </MetadataField>
        </div>

        {/* Summary -- editable */}
        <Card variant="flat" padding="md" style={{ marginBottom: theme.spacing.md }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.xs }}>
            <SectionLabel>Summary</SectionLabel>
            {!editingSummary && (
              <IconButton icon="edit" size={14} onClick={() => setEditingSummary(true)} aria-label="Edit summary" />
            )}
          </div>
          {editingSummary ? (
            <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
              <Textarea
                value={summaryValue}
                onChange={(e) => setSummaryValue(e.target.value)}
                autoFocus
                rows={4}
                placeholder="Task summary..."
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: theme.spacing.sm, justifyContent: "flex-end" }}>
                <Button variant="ghost" onClick={() => { setEditingSummary(false); setSummaryValue(task.summary ?? ""); }}>
                  Cancel
                </Button>
                <Button onClick={handleSummarySave}>Save</Button>
              </div>
            </div>
          ) : task.summary ? (
            <p
              onClick={() => setEditingSummary(true)}
              style={{
                margin: 0,
                fontSize: theme.font.size.sm,
                color: theme.color.text,
                cursor: "pointer",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
              }}
              title="Click to edit summary"
            >
              {task.summary}
            </p>
          ) : (
            <p
              onClick={() => setEditingSummary(true)}
              style={{
                margin: 0,
                fontSize: theme.font.size.sm,
                color: theme.color.textFaint,
                fontStyle: "italic",
                cursor: "pointer",
              }}
              title="Click to add summary"
            >
              No summary
            </p>
          )}
        </Card>

        {/* Dependencies -- always visible */}
        <Card variant="flat" padding="md" style={{ marginBottom: theme.spacing.sm }}>
          <SectionLabel style={{ marginBottom: theme.spacing.sm }}>Dependencies</SectionLabel>
          {depsLoading ? (
            <p style={{ margin: 0, fontSize: theme.font.size.xs, color: theme.color.textFaint }}>Loading dependencies...</p>
          ) : dependencies ? (
            <>
              <div ref={blockedByRef}>
                <DependencySection
                  title="Blocked By"
                  items={dependencies.blocked_by}
                  section="blocked_by"
                  projectId={task.project_id}
                  currentTaskId={task.id}
                  allExistingIds={allExistingIds}
                  onSelectTask={() => {}}
                  onRemove={handleRemoveDependency}
                  onAdd={handleAddDependency}
                />
              </div>
              <DependencySection
                title="Blocks"
                items={dependencies.blocks}
                section="blocks"
                projectId={task.project_id}
                currentTaskId={task.id}
                allExistingIds={allExistingIds}
                onSelectTask={() => {}}
                onRemove={handleRemoveDependency}
                onAdd={handleAddDependency}
              />
              <DependencySection
                title="Related"
                items={dependencies.relates_to}
                section="relates_to"
                projectId={task.project_id}
                currentTaskId={task.id}
                allExistingIds={allExistingIds}
                onSelectTask={() => {}}
                onRemove={handleRemoveDependency}
                onAdd={handleAddDependency}
              />
            </>
          ) : (
            <p style={{ margin: 0, fontSize: theme.font.size.xs, color: theme.color.textFaint, fontStyle: "italic" }}>
              Dependencies not available
            </p>
          )}
        </Card>

        {/* Read-only metadata footer */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: theme.spacing.xl,
            borderTop: `1px solid ${theme.color.borderSubtle}`,
          }}
        >
          <MetadataTable
            title="Info"
            rows={[
              { label: "ID", value: task.id },
              { label: "Created", value: formatDate(task.created_at) },
              { label: "Updated", value: formatDate(task.updated_at) },
            ]}
          />
        </div>
      </div>

    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// ProjectPage
// ---------------------------------------------------------------------------

export function ProjectPage({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const { theme } = useTheme();
  const windowWidth = useWindowWidth();
  const isWide = windowWidth >= theme.breakpoint.md;
  const { project, notFound, updateProject, addTask, updateTask, deleteTask } = useProject(projectId);
  const { showToast } = useToastContext();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<TaskSummary | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>({ status: "in_progress,todo" });
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Summary editing
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryValue, setSummaryValue] = useState("");

  // Reference picker
  const [referencePickerType, setReferencePickerType] = useState<ReferenceType | null>(null);
  const [showReferencePicker, setShowReferencePicker] = useState(false);

  const [graphStatusFilter, setGraphStatusFilter] = useState("in_progress,todo");
  const { graph, loading: graphLoading } = useDependencyGraph(projectId, graphStatusFilter || undefined);

  const { tasks, total, totalPages, page, setPage, loading: tasksLoading } = useProjectTasks(projectId, taskFilter);

  // Accumulate group keys from paginated tasks
  const groupKeySetRef = useRef<Set<string>>(new Set());
  const prevProjectIdRef = useRef(projectId);

  if (prevProjectIdRef.current !== projectId) {
    groupKeySetRef.current = new Set();
    prevProjectIdRef.current = projectId;
  }

  for (const t of tasks) {
    if (t.group_key != null && t.group_key !== "") {
      groupKeySetRef.current.add(t.group_key);
    }
  }

  const groupKeys = useMemo(
    () => [...groupKeySetRef.current].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, projectId],
  );

  const taskTitles = useMemo(() => new Map(tasks.map((t) => [t.id, t.title])), [tasks]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  useShortcut("n", "New task", () => setShowCreateTask(true), "Project");

  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const { subscribeEvents } = useEventSubscription();
  const selectedTaskIdRef = useRef(selectedTaskId);
  selectedTaskIdRef.current = selectedTaskId;

  const loadSelectedTask = useCallback((taskId: string) => {
    let cancelled = false;
    fetchTask(taskId)
      .then((t) => { if (!cancelled && selectedTaskIdRef.current === taskId) setSelectedTask(t); })
      .catch(() => { if (!cancelled && selectedTaskIdRef.current === taskId) setSelectedTask(null); });
    return () => { cancelled = true; };
  }, []);

  const throttledLoadSelected = useThrottledCallback(() => {
    const id = selectedTaskIdRef.current;
    if (id) loadSelectedTask(id);
  }, 200);

  useEffect(() => {
    if (!selectedTaskId) { setSelectedTask(null); return; }
    const cancelFetch = loadSelectedTask(selectedTaskId);
    const unsubscribe = subscribeEvents((event) => {
      if (event.entity_type === "task" && selectedTaskIdRef.current) {
        throttledLoadSelected();
      }
    });
    return () => { cancelFetch(); unsubscribe(); };
  }, [selectedTaskId, subscribeEvents, loadSelectedTask, throttledLoadSelected]);

  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

  async function handleAddTask(fields: { title: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string }) {
    await addTask(fields);
  }

  async function handleUpdateTaskStatus(taskId: string, status: TaskStatus) {
    try {
      await updateTasks([{ id: taskId, status }]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update task status", "error");
    }
  }

  async function handleDeleteTask() {
    if (!deleteTaskTarget) return;
    try {
      await deleteTask(deleteTaskTarget.id);
      if (selectedTaskId === deleteTaskTarget.id) {
        setSelectedTaskId(null);
      }
      setDeleteTaskTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete task");
    }
  }

  // Summary editing handlers
  function handleStartEditSummary() {
    if (!project) return;
    setEditingSummary(true);
    setSummaryValue(project.summary ?? "");
  }

  async function handleSaveSummary() {
    const trimmed = summaryValue.trim();
    await updateProject({ summary: trimmed || null });
    setEditingSummary(false);
    setSummaryValue("");
  }

  // Reference management
  const referencesByType = useMemo(() => {
    if (!project) return new Map<ReferenceType, DocumentReferenceDetail[]>();
    const map = new Map<ReferenceType, DocumentReferenceDetail[]>();
    for (const ref of project.documents) {
      const existing = map.get(ref.type) ?? [];
      existing.push(ref);
      map.set(ref.type, existing);
    }
    return map;
  }, [project]);

  const visibleTypes = useMemo(() => {
    if (!project) return [];
    const types = new Set<ReferenceType>(ALWAYS_SHOWN_TYPES);
    for (const ref of project.documents) {
      types.add(ref.type);
    }
    return REFERENCE_TYPES.filter((t) => types.has(t));
  }, [project]);

  async function handleAttachProjectDocument(documentId: string, type: ReferenceType) {
    if (!project) return;
    const existingRefs = project.documents.filter((r) => r.document_id === documentId).map((r) => ({ type: r.type }));
    const mergePatch: DocumentsMergePatch = {
      [documentId]: [...existingRefs, { type }],
    };
    await updateProject({ documents: mergePatch });
  }

  async function handleDetachProjectDocument(documentId: string, type: ReferenceType) {
    if (!project) return;
    const remaining = project.documents
      .filter((r) => r.document_id === documentId)
      .filter((r) => !(r.document_id === documentId && r.type === type))
      .map((r) => ({ type: r.type }));
    const mergePatch: DocumentsMergePatch = {
      [documentId]: remaining.length > 0 ? remaining : null,
    };
    await updateProject({ documents: mergePatch });
  }

  if (notFound) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 900, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box" }}>
        <BackButton onClick={onBack} />
        <EmptyState
          icon="error_outline"
          message="Project not found."
          variant="card"
          style={{ marginTop: theme.spacing.xl }}
        />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 900, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box" }}>
        <p style={{ color: theme.color.textMuted, fontSize: theme.font.size.sm }}>Loading...</p>
      </div>
    );
  }

  return (
    <>
    <DetailPageLayout expanded={isWide}>
      <div style={{
        flex: 1,
        minWidth: 0,
        padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto" as const,
        scrollbarWidth: "none" as const,
      }}>
        {/* Full-width header */}
        <BackButton onClick={onBack} label="All Projects" style={{ marginBottom: theme.spacing.lg }} />

        <Stack direction="row" justify="space-between" align="flex-start" wrap style={{ gap: theme.spacing.lg, marginBottom: theme.spacing.md }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingTitle ? (
              <Input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === "Escape") {
                    setEditingTitle(false);
                  }
                }}
                onBlur={() => {
                  const trimmed = titleValue.trim();
                  if (trimmed && trimmed !== project.title) {
                    updateProject({ title: trimmed });
                  }
                  setEditingTitle(false);
                }}
                aria-label="Edit project title"
                style={{
                  fontFamily: theme.font.headline,
                  fontSize: theme.font.size.xl,
                  fontWeight: 800,
                  letterSpacing: theme.font.letterSpacing.tight,
                  color: theme.color.text,
                  width: "100%",
                  padding: `0 ${theme.spacing.xs}`,
                  border: `1px solid ${theme.color.primary}`,
                  borderRadius: theme.radius.sm,
                  background: theme.color.surfaceContainer,
                  lineHeight: 1.3,
                }}
              />
            ) : (
              <Stack direction="row" align="center" gap="sm">
                <h2
                  role="button"
                  tabIndex={0}
                  onClick={() => { setTitleValue(project.title); setEditingTitle(true); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setTitleValue(project.title);
                      setEditingTitle(true);
                    }
                  }}
                  style={{
                    margin: 0,
                    fontFamily: theme.font.headline,
                    fontSize: theme.font.size.xl,
                    fontWeight: 800,
                    letterSpacing: theme.font.letterSpacing.tight,
                    color: theme.color.text,
                    cursor: "pointer",
                  }}
                  title="Click to edit title"
                >
                  {project.title}
                </h2>
                <IconButton
                  icon="edit"
                  size={16}
                  onClick={() => { setTitleValue(project.title); setEditingTitle(true); }}
                  aria-label="Edit project title"
                />
              </Stack>
            )}
          </div>
        </Stack>

        {/* Summary -- full width, editable */}
        <Card variant="flat" padding="md" style={{ marginBottom: theme.spacing.xl }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.xs }}>
            <SectionLabel>Summary</SectionLabel>
            {!editingSummary && (
              <IconButton icon="edit" size={14} onClick={handleStartEditSummary} aria-label="Edit summary" />
            )}
          </div>
          {editingSummary ? (
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setEditingSummary(false); } }}
            >
              <Textarea
                value={summaryValue}
                onChange={(e) => setSummaryValue(e.target.value)}
                rows={4}
                style={{ width: "100%", boxSizing: "border-box" }}
                autoFocus
              />
              <Stack direction="row" gap="sm" justify="flex-end" style={{ marginTop: theme.spacing.sm }}>
                <Button variant="ghost" onClick={() => setEditingSummary(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveSummary}>Save</Button>
              </Stack>
            </div>
          ) : project.summary ? (
            <p
              onClick={handleStartEditSummary}
              style={{
                margin: 0,
                fontSize: theme.font.size.sm,
                color: theme.color.text,
                cursor: "pointer",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
              }}
              title="Click to edit summary"
            >
              {project.summary}
            </p>
          ) : (
            <p
              onClick={handleStartEditSummary}
              style={{
                margin: 0,
                fontSize: theme.font.size.sm,
                color: theme.color.textFaint,
                fontStyle: "italic",
                cursor: "pointer",
              }}
              title="Click to add summary"
            >
              No summary
            </p>
          )}
        </Card>

        {/* Dependency Graph (collapsible) */}
        {!graphLoading && graph && graph.edges.length > 0 && (
          <ExpandableCard
            title="Dependency Graph"
            defaultOpen={false}
            style={{ marginBottom: theme.spacing.xl }}
            headerAction={
              <Select
                value={graphStatusFilter}
                onChange={(e) => setGraphStatusFilter(e.target.value)}
                options={graphStatusFilterOptions}
                style={{ minWidth: 120, fontSize: theme.font.size.xs }}
              />
            }
          >
            <DependencyGraphView
              tasks={graph.tasks}
              edges={graph.edges}
              blockedTaskIds={graph.blockedTaskIds}
              onTaskClick={(taskId) => setSelectedTaskId(taskId)}
            />
          </ExpandableCard>
        )}

        {/* Two-column area */}
        <div style={{
          display: "flex",
          flexDirection: isWide ? "row" : "column",
          gap: theme.spacing.xl,
        }}>
        {/* Left column -- document references */}
        <div style={{
          ...(isWide ? { flex: 1, minWidth: 0 } : {}),
        }}>
          <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: theme.spacing.md }}>
            <h3
              style={{
                margin: 0,
                fontFamily: theme.font.headline,
                fontSize: theme.font.size.lg,
                fontWeight: 700,
                color: theme.color.text,
              }}
            >
              Documents
            </h3>
            <Button
              variant="ghost"
              onClick={() => { setReferencePickerType(null); setShowReferencePicker(true); }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
                <Icon name="add" size={16} />
                Add Reference
              </span>
            </Button>
          </Stack>

          {visibleTypes.map((type) => (
            <DocumentReferenceSection
              key={type}
              type={type}
              references={referencesByType.get(type) ?? []}
              onOpenDocument={(docId) => setSelectedDocumentId(docId)}
              onDetachDocument={(docId) => handleDetachProjectDocument(docId, type)}
              onAddDocument={() => { setReferencePickerType(type); setShowReferencePicker(true); }}
            />
          ))}
        </div>

        {/* Right column -- tasks */}
        <div style={{
          flex: 1,
          minWidth: 0,
        }}>
          <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: theme.spacing.md }}>
            <h3
              style={{
                margin: 0,
                fontFamily: theme.font.headline,
                fontSize: theme.font.size.lg,
                fontWeight: 700,
                color: theme.color.text,
              }}
            >
              Tasks
            </h3>
            <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint }}>
              {total} task{total !== 1 ? "s" : ""}
            </span>
          </Stack>

          <Button onClick={() => setShowCreateTask(true)} style={{ marginBottom: theme.spacing.lg }}>
            <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
              <Icon name="add" size={16} />
              Add Task
            </span>
          </Button>

          <TaskTableFilters filter={taskFilter} onChange={setTaskFilter} groupKeys={groupKeys} />

          <div style={{ marginTop: theme.spacing.lg }}>
            {tasksLoading ? (
              <div style={{ textAlign: "center", padding: theme.spacing.xl, color: theme.color.textMuted }}>
                Loading...
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState icon="task" message="No tasks match the current filters." />
            ) : (
              <TaskTable
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onSelectTask={(id) => setSelectedTaskId(id)}
                onDeleteTask={(task) => setDeleteTaskTarget(task)}
                onUpdateTaskStatus={handleUpdateTaskStatus}
              />
            )}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          )}
        </div>
        </div>
      </div>
    </DetailPageLayout>

    {showCreateTask && (
      <CreateTaskOverlay
        onCreated={handleAddTask}
        onClose={() => setShowCreateTask(false)}
      />
    )}
    {selectedTask && (
      <TaskDetailPanel
        task={selectedTask}
        onClose={handleClosePanel}
        onUpdate={updateTask}
        taskTitles={taskTitles}
      />
    )}
    {selectedDocumentId && (
      <DocumentReaderModal
        documentId={selectedDocumentId}
        onClose={() => setSelectedDocumentId(null)}
      />
    )}
    {deleteTaskTarget && (
      <ConfirmDialog
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTaskTarget.title}"? This action cannot be undone.`}
        onConfirm={handleDeleteTask}
        onCancel={() => setDeleteTaskTarget(null)}
      />
    )}
    {showReferencePicker && project && (
      <DocumentReferencePicker
        entityType="project"
        entityId={project.id}
        existingReferences={project.documents}
        preselectedType={referencePickerType ?? undefined}
        onSave={async (mergePatch) => { await updateProject({ documents: mergePatch }); }}
        onClose={() => setShowReferencePicker(false)}
      />
    )}
  </>
  );
}
