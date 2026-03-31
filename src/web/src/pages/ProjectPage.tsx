import { useCallback, useState } from "react";
import {
  IconButton,
  Markdown,
  Stack,
  useTheme,
  DetailPageLayout,
  PageHeader,
  SidePanelLayout,
  BackButton,
  SectionLabel,
  CollapsibleSection,
  MetadataTable,
  AddItemInput,
  ListItem,
  EmptyState,
  ConfirmDialog,
} from "../components";
import { Badge } from "../components/atoms/Badge";
import { PresenceCharm } from "../components/molecules/PresenceCharm";
import { useProject } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import type { Task } from "../types";
import { formatDate } from "../utils";

const STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  archived: "Archived",
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

  return (
    <SidePanelLayout onClose={onClose}>
      {/* Header */}
      <div
        style={{
          padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`,
          borderBottom: `1px solid ${theme.color.borderSubtle}`,
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
        <SectionLabel>Plan</SectionLabel>
        {task.plan ? (
          <Markdown>{task.plan}</Markdown>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: theme.font.size.sm,
              color: theme.color.textFaint,
              fontStyle: "italic",
            }}
          >
            No plan yet
          </p>
        )}

        <SectionLabel style={{ marginTop: theme.spacing.lg }}>Description</SectionLabel>
        {task.description ? (
          <Markdown>{task.description}</Markdown>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: theme.font.size.sm,
              color: theme.color.textFaint,
              fontStyle: "italic",
            }}
          >
            No description yet
          </p>
        )}

        <SectionLabel style={{ marginTop: theme.spacing.lg }}>Implementation</SectionLabel>
        {task.implementation ? (
          <Markdown>{task.implementation}</Markdown>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: theme.font.size.sm,
              color: theme.color.textFaint,
              fontStyle: "italic",
            }}
          >
            No implementation yet
          </p>
        )}

        <SectionLabel style={{ marginTop: theme.spacing.lg }}>Acceptance Criteria</SectionLabel>
        {task.acceptance_criteria ? (
          <Markdown>{task.acceptance_criteria}</Markdown>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: theme.font.size.sm,
              color: theme.color.textFaint,
              fontStyle: "italic",
            }}
          >
            No acceptance criteria yet
          </p>
        )}

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
    </SidePanelLayout>
  );
}

// ---------------------------------------------------------------------------
// ProjectPage
// ---------------------------------------------------------------------------

export function ProjectPage({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const { theme } = useTheme();
  const { project, tasks, notFound, updateProject, addTask, deleteTask } = useProject(projectId);
  const { showToast } = useToastContext();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;

  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

  async function handleAddTask() {
    if (!newTaskTitle.trim() || !project) return;
    setAddingTask(true);
    try {
      await addTask(newTaskTitle);
      setNewTaskTitle("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add task");
    } finally {
      setAddingTask(false);
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
    <DetailPageLayout expanded={!!selectedTask}>
      <div style={{ flex: 1, minWidth: 0, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box", overflowY: "auto" }}>
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

        {/* Markdown sections: goal, requirements, design */}
        {([
          { key: "goal" as const, label: "Goal" },
          { key: "requirements" as const, label: "Requirements" },
          { key: "design" as const, label: "Design" },
        ]).map(({ key, label }) => (
          <CollapsibleSection key={key} label={label} defaultOpen style={{ marginBottom: theme.spacing.xl }}>
            {project[key] ? (
              <Markdown>{project[key]}</Markdown>
            ) : (
              <p style={{ margin: 0, fontSize: theme.font.size.sm, color: theme.color.textFaint, fontStyle: "italic" }}>
                Not set
              </p>
            )}
          </CollapsibleSection>
        ))}

        {/* Tasks */}
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
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
        </Stack>

        <AddItemInput
          placeholder="Add a task..."
          value={newTaskTitle}
          onChange={setNewTaskTitle}
          onSubmit={handleAddTask}
          loading={addingTask}
          style={{ marginBottom: theme.spacing.xl }}
        />

        <Stack gap="xs">
          {tasks.map((task) => (
            <ListItem
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              selected={selectedTaskId === task.id}
            >
              <Stack direction="row" justify="space-between" align="center" gap="xs">
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: theme.font.size.sm,
                    color: task.status === "done" ? theme.color.textMuted : theme.color.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: task.status === "done" ? "line-through" : "none",
                  }}
                >
                  {task.title}
                </span>
                <Badge variant={statusBadgeVariant(task.status)}>
                  {STATUS_LABELS[task.status] ?? task.status}
                </Badge>
                <PresenceCharm active={task.plan != null} label="Has plan" color={theme.color.success} />
                <IconButton
                  icon="delete"
                  size={14}
                  onClick={(e) => { e.stopPropagation(); setDeleteTaskTarget(task); }}
                  aria-label="Delete task"
                />
              </Stack>
            </ListItem>
          ))}
          {tasks.length === 0 && (
            <EmptyState icon="task" message="No tasks yet. Add one above." />
          )}
        </Stack>
      </div>

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
    </DetailPageLayout>
  );
}
