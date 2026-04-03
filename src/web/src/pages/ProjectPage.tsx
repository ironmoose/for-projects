import { useCallback, useEffect, useState } from "react";
import { sg } from "../components/theme/synthGlow";
import {
  Button,
  Icon,
  IconButton,
  Input,
  Select,
  Textarea,
  Markdown,
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
  Overlay,
  DocumentReaderModal,
} from "../components";
import { CreateTaskOverlay } from "../components/organisms/CreateTaskOverlay";
import { Badge } from "../components/atoms/Badge";
import { useProject } from "../hooks";
import { useWindowWidth } from "../hooks/useWindowWidth";
import { useProjectTasks } from "../hooks/useProjectTasks";
import type { TaskFilter } from "../hooks/useProjectTasks";
import { useToastContext } from "../components/ToastContext";
import { ApiError, fetchTask } from "../api";
import type { Task, TaskSummary } from "../types";
import {
  TASK_STATUSES,
  EFFORT_LEVELS,
  IMPACT_LEVELS,
  TASK_CATEGORIES,
} from "../types";
import { formatDate } from "../utils";

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

// ---------------------------------------------------------------------------
// TaskDetailPanel
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Select option helpers (mirrors CreateTaskOverlay pattern)
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

// ---------------------------------------------------------------------------
// MetadataField — label + select/input for inline metadata editing
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Text field names we support editing
// ---------------------------------------------------------------------------

type EditableTextField = "description" | "plan" | "implementation" | "acceptance_criteria";

const TEXT_FIELDS: { key: EditableTextField; label: string; defaultOpen: boolean }[] = [
  { key: "description", label: "Description", defaultOpen: true },
  { key: "plan", label: "Plan", defaultOpen: false },
  { key: "implementation", label: "Implementation", defaultOpen: false },
  { key: "acceptance_criteria", label: "Acceptance Criteria", defaultOpen: false },
];

function TaskDetailPanel({
  task,
  onClose,
  onUpdate,
}: {
  task: Task;
  onClose: () => void;
  onUpdate: (taskId: string, input: Record<string, string | null | undefined>) => Promise<void>;
}) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";

  // Title editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);

  // Text field editing state — only one at a time
  const [editingTextField, setEditingTextField] = useState<EditableTextField | null>(null);
  const [editTextValue, setEditTextValue] = useState("");

  // Group key editing state
  const [editingGroupKey, setEditingGroupKey] = useState(false);
  const [groupKeyValue, setGroupKeyValue] = useState(task.group_key ?? "");

  // Sync title/groupKey when task prop changes
  useEffect(() => {
    if (!editingTitle) setTitleValue(task.title);
  }, [task.title, editingTitle]);

  useEffect(() => {
    if (!editingGroupKey) setGroupKeyValue(task.group_key ?? "");
  }, [task.group_key, editingGroupKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingTitle) { setEditingTitle(false); setTitleValue(task.title); return; }
        if (editingTextField) { setEditingTextField(null); return; }
        if (editingGroupKey) { setEditingGroupKey(false); setGroupKeyValue(task.group_key ?? ""); return; }
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, editingTitle, editingTextField, editingGroupKey, task.title, task.group_key]);

  const emptyText = (label: string) => (
    <p
      style={{
        margin: 0,
        fontSize: theme.font.size.sm,
        color: theme.color.textFaint,
        fontStyle: "italic",
      }}
    >
      No {label} yet
    </p>
  );

  // --- Metadata save handlers ---
  async function handleMetadataChange(field: string, value: string) {
    const sendValue = value === "" ? null : value;
    await onUpdate(task.id, { [field]: sendValue });
  }

  // --- Title save ---
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

  // --- Group key save ---
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

  // --- Text field save ---
  async function handleTextFieldSave() {
    if (!editingTextField) return;
    const trimmed = editTextValue.trim();
    const sendValue = trimmed === "" ? null : trimmed;
    await onUpdate(task.id, { [editingTextField]: sendValue });
    setEditingTextField(null);
  }

  function startEditingTextField(key: EditableTextField) {
    setEditingTextField(key);
    setEditTextValue(task[key] ?? "");
  }

  const editButton = (key: EditableTextField) => (
    <IconButton
      icon="edit"
      size={14}
      onClick={() => startEditingTextField(key)}
      aria-label={`Edit ${key.replace(/_/g, " ")}`}
    />
  );

  return (
    <>
      <Overlay onClick={onClose} zIndex={200} style={{ background: "rgba(0,0,0,0.5)" }} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 201,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: "auto",
            background: theme.color.surfaceContainer,
            borderRadius: theme.radius.lg,
            boxShadow: isSynth
              ? `0 0 30px ${sg(19)}, 0 0 60px ${sg(9)}, 0 8px 40px rgba(0,0,0,0.5)`
              : theme.shadow.lg,
            border: `1px solid ${isSynth ? sg(27) : theme.color.borderSubtle}`,
            width: "100%",
            maxWidth: 1000,
            minHeight: "50vh",
            maxHeight: "75vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header — editable title */}
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
            {/* Metadata — inline editable selects and group key input */}
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

            {/* Group key — editable inline input */}
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

            {/* Text fields — each with edit button, only one editable at a time */}
            {TEXT_FIELDS.map(({ key, label, defaultOpen }, idx) => (
              <ExpandableCard
                key={key}
                title={label}
                defaultOpen={defaultOpen}
                variant="flat"
                style={{ marginBottom: idx < TEXT_FIELDS.length - 1 ? theme.spacing.sm : 0 }}
                headerAction={editingTextField !== key ? editButton(key) : undefined}
              >
                {editingTextField === key ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
                    <Textarea
                      value={editTextValue}
                      onChange={(e) => setEditTextValue(e.target.value)}
                      autoFocus
                      rows={8}
                      placeholder={`Enter ${label.toLowerCase()}...`}
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: theme.spacing.sm, justifyContent: "flex-end" }}>
                      <Button
                        variant="ghost"
                        onClick={() => setEditingTextField(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleTextFieldSave}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  task[key] ? <Markdown>{task[key]}</Markdown> : emptyText(label.toLowerCase())
                )}
              </ExpandableCard>
            ))}

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
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// DocumentRow — clickable row for linked documents
// ---------------------------------------------------------------------------

function DocumentRow({ title, isLast, onClick }: { title: string; isLast: boolean; onClick: () => void }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        cursor: "pointer",
        background: hovered ? theme.color.surfaceContainerHigh : "transparent",
        borderBottom: isLast ? "none" : `1px solid ${theme.color.borderSubtle}`,
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.sm,
        transition: "background 120ms ease",
      }}
    >
      <Icon name="description" size={16} style={{ color: theme.color.text, flexShrink: 0 }} />
      <span
        style={{
          fontSize: theme.font.size.sm,
          color: theme.color.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
    </div>
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

  const { tasks, total, totalPages, page, setPage, loading: tasksLoading } = useProjectTasks(projectId, taskFilter);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!selectedTaskId) { setSelectedTask(null); return; }
    let cancelled = false;
    fetchTask(selectedTaskId)
      .then((t) => { if (!cancelled) setSelectedTask(t); })
      .catch(() => { if (!cancelled) setSelectedTask(null); });
    return () => { cancelled = true; };
  }, [selectedTaskId, tasks]);

  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

  async function handleAddTask(fields: { title: string; description?: string; plan?: string; acceptance_criteria?: string; implementation?: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string }) {
    await addTask(fields);
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

        <Stack direction="row" justify="space-between" align="flex-start" wrap style={{ gap: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: theme.font.headline,
                fontSize: theme.font.size.xl,
                fontWeight: 800,
                letterSpacing: theme.font.letterSpacing.tight,
                color: theme.color.text,
              }}
            >
              {project.title}
            </h2>
          </div>
        </Stack>

        {/* Two-column area */}
        <div style={{
          display: "flex",
          flexDirection: isWide ? "row" : "column",
          gap: theme.spacing.xl,
        }}>
        {/* Left column — metadata */}
        <div style={{
          ...(isWide
            ? { flex: 1, minWidth: 0 }
            : {}),
        }}>
          {/* Markdown sections: goal, requirements, design */}
          {([
            { key: "goal" as const, label: "Goal", defaultOpen: true },
            { key: "requirements" as const, label: "Requirements", defaultOpen: false },
            { key: "design" as const, label: "Design", defaultOpen: false },
          ]).map(({ key, label, defaultOpen }) => (
            <ExpandableCard key={key} title={label} defaultOpen={isWide || defaultOpen} style={{ marginBottom: theme.spacing.xl }}>
              {project[key] ? (
                <Markdown>{project[key]}</Markdown>
              ) : (
                <p style={{ margin: 0, fontSize: theme.font.size.sm, color: theme.color.textFaint, fontStyle: "italic" }}>
                  Not set
                </p>
              )}
            </ExpandableCard>
          ))}

          {/* Documents section */}
          {(project.documents ?? []).length > 0 && (
            <div style={{ marginBottom: theme.spacing.xl }}>
              <h3
                style={{
                  margin: 0,
                  marginBottom: theme.spacing.md,
                  fontFamily: theme.font.headline,
                  fontSize: theme.font.size.lg,
                  fontWeight: 700,
                  color: theme.color.text,
                }}
              >
                Documents
              </h3>
              <div
                style={{
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.color.border}`,
                  background: theme.color.surfaceContainer,
                  overflow: "hidden",
                }}
              >
                {(project.documents ?? []).map((doc, idx) => (
                  <DocumentRow
                    key={doc.id}
                    title={doc.title}
                    isLast={idx === (project.documents ?? []).length - 1}
                    onClick={() => setSelectedDocumentId(doc.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — tasks */}
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

          <TaskTableFilters filter={taskFilter} onChange={setTaskFilter} />

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
  </>
  );
}
