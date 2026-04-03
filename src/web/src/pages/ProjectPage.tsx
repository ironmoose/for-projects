import { useCallback, useEffect, useState } from "react";
import { sg } from "../components/theme/synthGlow";
import {
  Button,
  Icon,
  IconButton,
  Input,
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
  CreateEntityOverlay,
  TagChip,
} from "../components";
import { CreateTaskOverlay } from "../components/organisms/CreateTaskOverlay";
import { Badge } from "../components/atoms/Badge";
import { useProject } from "../hooks";
import { useWindowWidth } from "../hooks/useWindowWidth";
import { useProjectTasks } from "../hooks/useProjectTasks";
import type { TaskFilter } from "../hooks/useProjectTasks";
import { useToastContext } from "../components/ToastContext";
import { ApiError, fetchTask, fetchDocuments } from "../api";
import type { Task, TaskSummary, DocumentSummary } from "../types";
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

function TaskDetailPanel({ task, onClose }: { task: Task; onClose: () => void }) {
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
          {/* Header */}
          <div
            style={{
              padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`,
              borderBottom: `1px solid ${theme.color.borderSubtle}`,
              flexShrink: 0,
            }}
          >
            <Stack direction="row" justify="space-between" align="flex-start" gap="sm">
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: theme.font.headline,
                    fontSize: theme.font.size.xl,
                    fontWeight: 800,
                    letterSpacing: theme.font.letterSpacing.tight,
                    color: theme.color.text,
                    lineHeight: 1.3,
                  }}
                >
                  {task.title}
                </h2>
              </div>
              <IconButton icon="close" size={18} onClick={onClose} aria-label="Close detail panel" />
            </Stack>
            <div style={{ marginTop: theme.spacing.sm }}>
              <Badge variant={statusBadgeVariant(task.status)}>
                {STATUS_LABELS[task.status] ?? task.status}
              </Badge>
            </div>
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
            <ExpandableCard title="Description" defaultOpen variant="flat" style={{ marginBottom: theme.spacing.sm }}>
              {task.description ? <Markdown>{task.description}</Markdown> : emptyText("description")}
            </ExpandableCard>

            <ExpandableCard title="Plan" defaultOpen={false} variant="flat" style={{ marginBottom: theme.spacing.sm }}>
              {task.plan ? <Markdown>{task.plan}</Markdown> : emptyText("plan")}
            </ExpandableCard>

            <ExpandableCard title="Implementation" defaultOpen={false} variant="flat" style={{ marginBottom: theme.spacing.sm }}>
              {task.implementation ? <Markdown>{task.implementation}</Markdown> : emptyText("implementation")}
            </ExpandableCard>

            <ExpandableCard title="Acceptance Criteria" defaultOpen={false} variant="flat">
              {task.acceptance_criteria ? <Markdown>{task.acceptance_criteria}</Markdown> : emptyText("acceptance criteria")}
            </ExpandableCard>

            {/* Metadata */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: theme.spacing.xl,
                borderTop: `1px solid ${theme.color.borderSubtle}`,
              }}
            >
              <MetadataTable
                title="Metadata"
                rows={[
                  { label: "ID", value: task.id },
                  { label: "Status", value: STATUS_LABELS[task.status] ?? task.status },
                  ...(task.group_key ? [{ label: "Group", value: task.group_key }] : []),
                  ...(task.effort ? [{ label: "Effort", value: task.effort }] : []),
                  ...(task.impact ? [{ label: "Impact", value: task.impact }] : []),
                  ...(task.category ? [{ label: "Category", value: task.category }] : []),
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

function DocumentRow({ title, isLast, onClick, onDetach }: { title: string; isLast: boolean; onClick: () => void; onDetach: () => void }) {
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
          flex: 1,
        }}
      >
        {title}
      </span>
      <IconButton
        icon="close"
        size={14}
        onClick={(e) => { e.stopPropagation(); onDetach(); }}
        aria-label={`Detach ${title}`}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocumentPickerOverlay
// ---------------------------------------------------------------------------

interface DocumentPickerOverlayProps {
  linkedDocIds: Set<string>;
  onSubmit: (attach: string[], detach: string[]) => Promise<void>;
  onClose: () => void;
}

function DocumentPickerOverlay({ linkedDocIds, onSubmit, onClose }: DocumentPickerOverlayProps) {
  const { theme } = useTheme();
  const [allDocs, setAllDocs] = useState<DocumentSummary[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(linkedDocIds));
  const [titleSearch, setTitleSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingDocs(true);
    fetchDocuments({ limit: 200 })
      .then((res) => { if (!cancelled) setAllDocs(res.data); })
      .catch(() => { /* toast handled by caller context */ })
      .finally(() => { if (!cancelled) setLoadingDocs(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = titleSearch
    ? allDocs.filter((d) => d.title.toLowerCase().includes(titleSearch.toLowerCase()))
    : allDocs;

  function toggleDoc(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    const attach: string[] = [];
    const detach: string[] = [];
    for (const id of selected) {
      if (!linkedDocIds.has(id)) attach.push(id);
    }
    for (const id of linkedDocIds) {
      if (!selected.has(id)) detach.push(id);
    }
    if (attach.length === 0 && detach.length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(attach, detach);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CreateEntityOverlay
      title="Manage Documents"
      onSubmit={handleSubmit}
      onClose={onClose}
      loading={submitting}
      submitLabel="Save"
      submitDisabled={loadingDocs}
    >
      <Input
        value={titleSearch}
        onChange={(e) => setTitleSearch(e.target.value)}
        placeholder="Search by title..."
        style={{ marginBottom: theme.spacing.sm }}
      />
      <div
        style={{
          maxHeight: 320,
          overflowY: "auto",
          border: `1px solid ${theme.color.borderSubtle}`,
          borderRadius: theme.radius.md,
          background: theme.color.surface,
        }}
      >
        {loadingDocs ? (
          <div style={{ padding: theme.spacing.lg, textAlign: "center", color: theme.color.textMuted, fontSize: theme.font.size.sm }}>
            Loading documents...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: theme.spacing.lg, textAlign: "center", color: theme.color.textMuted, fontSize: theme.font.size.sm }}>
            {allDocs.length === 0 ? "No documents exist yet." : "No documents match the search."}
          </div>
        ) : (
          filtered.map((doc) => (
            <label
              key={doc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: theme.spacing.sm,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                cursor: "pointer",
                borderBottom: `1px solid ${theme.color.borderSubtle}`,
                fontSize: theme.font.size.sm,
                color: theme.color.text,
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(doc.id)}
                onChange={() => toggleDoc(doc.id)}
                style={{ flexShrink: 0 }}
              />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.title}
              </span>
              {doc.tags.length > 0 && (
                <span style={{ display: "flex", gap: theme.spacing.xs, flexShrink: 0 }}>
                  {doc.tags.map((tag) => (
                    <TagChip key={tag} name={tag} />
                  ))}
                </span>
              )}
            </label>
          ))
        )}
      </div>
    </CreateEntityOverlay>
  );
}

// ---------------------------------------------------------------------------
// ProjectPage
// ---------------------------------------------------------------------------

export function ProjectPage({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const { theme } = useTheme();
  const windowWidth = useWindowWidth();
  const isWide = windowWidth >= theme.breakpoint.md;
  const { project, notFound, updateProject, addTask, deleteTask } = useProject(projectId);
  const { showToast } = useToastContext();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<TaskSummary | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>({ status: "in_progress,todo" });
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showDocPicker, setShowDocPicker] = useState(false);

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
          <div style={{ marginBottom: theme.spacing.xl }}>
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
              <Button variant="ghost" onClick={() => setShowDocPicker(true)}>
                <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
                  <Icon name="edit_note" size={16} />
                  Manage Documents
                </span>
              </Button>
            </Stack>
            {(project.documents ?? []).length > 0 ? (
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
                    onDetach={() => {
                      updateProject({ detach_documents: [doc.id] }).catch(() => {});
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon="description" message="No documents linked." />
            )}
          </div>
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
    {showDocPicker && (
      <DocumentPickerOverlay
        linkedDocIds={new Set((project.documents ?? []).map((d) => d.id))}
        onSubmit={async (attach, detach) => {
          const input: { attach_documents?: string[]; detach_documents?: string[] } = {};
          if (attach.length > 0) input.attach_documents = attach;
          if (detach.length > 0) input.detach_documents = detach;
          await updateProject(input);
        }}
        onClose={() => setShowDocPicker(false)}
      />
    )}
  </>
  );
}
