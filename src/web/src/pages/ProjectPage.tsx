import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Icon,
  IconButton,
  Input,
  Markdown,
  Select,
  Stack,
  useTheme,
  DetailPageLayout,
  PageHeader,
  SidePanelLayout,
  BackButton,
  SectionLabel,
  MetadataTable,
  TagChip,
  AddItemInput,
  ListItem,
  EmptyState,
  StatusDot,
} from "../components";
import { useProject, useTaskTags } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import type { Task } from "../types";
import { statusOptions, taskStatusOptions, statusLabel } from "../types";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// TaskDetailPanel
// ---------------------------------------------------------------------------

function TaskDetailPanel({ task, projectId, onClose }: { task: Task; projectId: string; onClose: () => void }) {
  const { theme } = useTheme();
  const { tags, addTag, removeTag } = useTaskTags(projectId, task.id);
  const { showToast } = useToastContext();
  const [newTagName, setNewTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleAddTag() {
    if (!newTagName.trim()) return;
    setAddingTag(true);
    try {
      await addTag(newTagName);
      setNewTagName("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add tag");
    } finally {
      setAddingTag(false);
    }
  }

  const statusColor =
    task.status === "done" ? theme.color.success
    : task.status === "in_progress" ? theme.color.tertiary
    : theme.color.textFaint;

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
            <Stack direction="row" align="center" gap="xs" style={{ marginBottom: theme.spacing.sm }}>
              <StatusDot color={statusColor} />
              <span
                style={{
                  fontSize: theme.font.size.xs,
                  color: theme.color.textMuted,
                  fontWeight: 500,
                }}
              >
                {statusLabel[task.status]}
              </span>
            </Stack>

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
              <span style={{ color: theme.color.textFaint, fontFamily: theme.font.mono, fontWeight: 500, fontSize: theme.font.size.sm }}>
                #{task.number}
              </span>{" "}
              {task.title}
            </h2>
            {task.priority != null && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: theme.spacing.xs,
                  fontSize: theme.font.size.xs,
                  fontWeight: 600,
                  color: task.priority <= 3 ? theme.color.danger : task.priority <= 6 ? theme.color.tertiary : theme.color.textFaint,
                  background: theme.color.surfaceContainerHigh,
                  borderRadius: theme.radius.sm,
                  padding: "2px 6px",
                }}
              >
                Priority {task.priority}
              </span>
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
            No description
          </p>
        )}

        {/* Tags */}
        <div style={{ marginTop: theme.spacing.xl }}>
          <SectionLabel style={{ marginBottom: theme.spacing.sm }}>Tags</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
            {tags.map((tag) => (
              <TagChip
                key={tag.id}
                name={tag.name}
                prefix={tag.prefix}
                onRemove={() => removeTag(tag.id)}
              />
            ))}
            {tags.length === 0 && (
              <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint, fontStyle: "italic" }}>
                No tags
              </span>
            )}
          </div>
          <AddItemInput
            placeholder="Add tag..."
            value={newTagName}
            onChange={setNewTagName}
            onSubmit={handleAddTag}
            loading={addingTag}
          />
        </div>

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
              { label: "Number", value: `#${task.number}` },
              { label: "ID", value: task.id },
              { label: "Type", value: task.type ?? "\u2014" },
              { label: "Effort", value: task.effort ?? "\u2014" },
              { label: "Priority", value: task.priority != null ? `${task.priority}` : "\u2014" },
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
// Task accent color
// ---------------------------------------------------------------------------

function taskAccentColor(theme: ReturnType<typeof useTheme>["theme"], status: Task["status"]): string {
  switch (status) {
    case "in_progress": return theme.color.tertiary;
    case "done": return theme.color.success;
    case "todo": return theme.color.textFaint;
  }
}

// ---------------------------------------------------------------------------
// ProjectPage
// ---------------------------------------------------------------------------

export function ProjectPage({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const { theme } = useTheme();
  const { project, tasks, notFound, updateProjectStatus, addTask, updateTaskStatus, deleteTask } = useProject(projectId);
  const { showToast } = useToastContext();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);

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

  // Sort: in_progress first, then todo, then done
  const statusOrder: Record<Task["status"], number> = { in_progress: 0, todo: 1, done: 2 };
  const sortedTasks = [...tasks].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return (
    <DetailPageLayout expanded={!!selectedTask}>
      <div style={{ flex: 1, minWidth: 0, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box", overflowY: "auto" }}>
        <BackButton onClick={onBack} label="All Projects" style={{ marginBottom: theme.spacing.lg }} />

        <Stack direction="row" justify="space-between" align="flex-start" wrap style={{ gap: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" align="center" gap="sm" style={{ marginBottom: theme.spacing.sm }}>
              <Badge variant={project.status}>{project.status}</Badge>
            </Stack>
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
              {project.name}
            </h2>
            {project.description && (
              <p style={{ margin: `${theme.spacing.sm} 0 0`, color: theme.color.textMuted, fontSize: theme.font.size.sm, lineHeight: 1.5 }}>
                {project.description}
              </p>
            )}
          </div>
          <Select
            value={project.status}
            onChange={(e) => updateProjectStatus(e.target.value as typeof project.status)}
            options={statusOptions}
          />
        </Stack>

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
          {sortedTasks.map((task) => (
            <ListItem
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              selected={selectedTaskId === task.id}
              style={{ borderLeft: `3px solid ${taskAccentColor(theme, task.status)}` }}
            >
              <Stack direction="row" justify="space-between" align="center" gap="xs">
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: theme.font.size.sm,
                    color: task.status === "done" ? theme.color.textFaint : theme.color.text,
                    textDecoration: task.status === "done" ? "line-through" : undefined,
                    opacity: task.status === "done" ? 0.5 : 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.xs,
                  }}
                >
                  <span style={{ color: theme.color.textFaint, fontFamily: theme.font.mono, fontSize: theme.font.size.xs, flexShrink: 0 }}>
                    #{task.number}
                  </span>
                  {task.title}
                  {task.type != null && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        color: theme.color.primary,
                        background: theme.color.surfaceContainerHigh,
                        borderRadius: theme.radius.sm,
                        padding: "1px 4px",
                      }}
                    >
                      {task.type}
                    </span>
                  )}
                  {task.effort != null && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        color: task.effort === "extreme" || task.effort === "high" ? theme.color.danger : task.effort === "moderate" ? theme.color.tertiary : theme.color.textFaint,
                        background: theme.color.surfaceContainerHigh,
                        borderRadius: theme.radius.sm,
                        padding: "1px 4px",
                      }}
                    >
                      {task.effort}
                    </span>
                  )}
                  {task.priority != null && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        color: task.priority <= 3 ? theme.color.danger : task.priority <= 6 ? theme.color.tertiary : theme.color.textFaint,
                        background: theme.color.surfaceContainerHigh,
                        borderRadius: theme.radius.sm,
                        padding: "1px 4px",
                      }}
                    >
                      P{task.priority}
                    </span>
                  )}
                </span>
                <Stack direction="row" gap="xs" style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={task.status}
                    onChange={(e) => updateTaskStatus(task.id, e.target.value as Task["status"])}
                    options={taskStatusOptions}
                    style={{ fontSize: theme.font.size.xxs, padding: "0.1rem 0.25rem" }}
                  />
                  <IconButton
                    icon="close"
                    size={12}
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                    style={{ color: theme.color.textFaint, width: 18, height: 18 }}
                  />
                </Stack>
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
          projectId={projectId}
          onClose={handleClosePanel}
        />
      )}
    </DetailPageLayout>
  );
}
