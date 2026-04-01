import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Icon,
  IconButton,
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
  const { theme } = useTheme();

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
            boxShadow: theme.shadow.lg,
            border: `1px solid ${theme.color.borderSubtle}`,
            width: "100%",
            maxWidth: 720,
            maxHeight: "85vh",
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
