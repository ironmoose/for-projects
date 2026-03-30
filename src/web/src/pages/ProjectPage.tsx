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
import { PresenceCharm } from "../components/molecules/PresenceCharm";
import { useProject } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import type { Task } from "../types";
import { formatDate } from "../utils";

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
                    color: theme.color.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {task.title}
                </span>
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
