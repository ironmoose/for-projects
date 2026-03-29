import { useCallback, useState } from "react";
import {
  Badge,
  IconButton,
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
  AddItemInput,
  ListItem,
  EmptyState,
  StatusDot,
} from "../components";
import { ActionSlot } from "../components/molecules/ActionSlot";
import { CreateActionOverlay } from "../components/organisms/CreateActionOverlay";
import { ActionDetailPanel } from "../components/organisms/ActionDetailPanel";
import { useProject, useEntityActions } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError, updateEntityActionStatus } from "../api";
import type { Task, Action, ActionStatus, EntityAction } from "../types";
import { statusOptions, taskStatusOptions, statusLabel } from "../types";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// TaskDetailPanel
// ---------------------------------------------------------------------------

function TaskDetailPanel({ task, projectId, onClose }: { task: Task; projectId: string; onClose: () => void }) {
  const { theme } = useTheme();
  const { actionsMap: taskActionsMap } = useEntityActions("task", task.id);
  const [taskOverlayField, setTaskOverlayField] = useState<"implementation" | "validation" | null>(null);
  const [selectedTaskAction, setSelectedTaskAction] = useState<{ action: Action; entityAction: EntityAction } | null>(null);

  const statusColor =
    task.status === "done" ? theme.color.success
    : task.status === "in_progress" ? theme.color.tertiary
    : theme.color.textFaint;

  if (selectedTaskAction) {
    return (
      <ActionDetailPanel
        action={selectedTaskAction.action}
        entityAction={selectedTaskAction.entityAction}
        onClose={() => setSelectedTaskAction(null)}
        onStatusChange={async (status: ActionStatus) => {
          await updateEntityActionStatus("task", task.id, selectedTaskAction.entityAction.role, status);
        }}
      />
    );
  }

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
              {task.summary}
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
        {task.context ? (
          <Markdown>{task.context}</Markdown>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: theme.font.size.sm,
              color: theme.color.textFaint,
              fontStyle: "italic",
            }}
          >
            No context
          </p>
        )}

        {/* Action Slots */}
        <div style={{ display: "flex", gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
          {(["implementation", "validation"] as const).map((field) => {
            const entry = taskActionsMap[field];
            return (
              <div key={field} style={{ flex: 1 }}>
                <ActionSlot
                  label={field.charAt(0).toUpperCase() + field.slice(1)}
                  action={entry?.action ?? null}
                  entityAction={entry?.entityAction}
                  onCreateClick={() => setTaskOverlayField(field)}
                  onActionClick={() => { if (entry) setSelectedTaskAction(entry); }}
                />
              </div>
            );
          })}
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
              { label: "ID", value: task.id },
              { label: "Created", value: formatDate(task.created_at) },
              { label: "Updated", value: formatDate(task.updated_at) },
            ]}
          />
        </div>
      </div>

      {taskOverlayField && (
        <CreateActionOverlay
          entityType="task"
          entityId={task.id}
          field={taskOverlayField}
          onCreated={() => {
            // useEntityActions will refetch via WebSocket events
          }}
          onClose={() => setTaskOverlayField(null)}
        />
      )}
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
  const { project, tasks, notFound, updateProjectStatus, addTask, updateTaskStatus } = useProject(projectId);
  const { actionsMap: projectActionsMap } = useEntityActions("project", project?.id);
  const { showToast } = useToastContext();
  const [newTaskSummary, setNewTaskSummary] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [overlayField, setOverlayField] = useState<"goal" | "design" | "requirements" | null>(null);
  const [selectedAction, setSelectedAction] = useState<{ action: Action; entityAction: EntityAction } | null>(null);

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;

  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

  async function handleAddTask() {
    if (!newTaskSummary.trim() || !project) return;
    setAddingTask(true);
    try {
      await addTask(newTaskSummary);
      setNewTaskSummary("");
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
    <DetailPageLayout expanded={!!selectedTask || !!selectedAction}>
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
              <div style={{ marginTop: theme.spacing.sm }}>
                <Markdown>{project.description}</Markdown>
              </div>
            )}
          </div>
          <Select
            value={project.status}
            onChange={(e) => updateProjectStatus(e.target.value as typeof project.status)}
            options={statusOptions}
          />
        </Stack>

        {/* Actions */}
        <div style={{ marginBottom: theme.spacing.xl }}>
          <div style={{ display: "flex", gap: theme.spacing.md }}>
            {(["goal", "design", "requirements"] as const).map((field) => {
              const entry = projectActionsMap[field];
              return (
                <div key={field} style={{ flex: 1 }}>
                  <ActionSlot
                    label={field.charAt(0).toUpperCase() + field.slice(1)}
                    action={entry?.action ?? null}
                    entityAction={entry?.entityAction}
                    onCreateClick={() => setOverlayField(field)}
                    onActionClick={() => { if (entry) setSelectedAction(entry); }}
                  />
                </div>
              );
            })}
          </div>
        </div>

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
          value={newTaskSummary}
          onChange={setNewTaskSummary}
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
                  }}
                >
                  {task.summary}
                </span>
                <Stack direction="row" gap="xs" style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={task.status}
                    onChange={(e) => updateTaskStatus(task.id, e.target.value as Task["status"])}
                    options={taskStatusOptions}
                    style={{ fontSize: theme.font.size.xxs, padding: "0.1rem 0.25rem" }}
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

      {selectedAction && !selectedTask && (
        <ActionDetailPanel
          action={selectedAction.action}
          entityAction={selectedAction.entityAction}
          onClose={() => setSelectedAction(null)}
          onStatusChange={async (status: ActionStatus) => {
            await updateEntityActionStatus("project", project!.id, selectedAction.entityAction.role, status);
          }}
        />
      )}

      {overlayField && project && (
        <CreateActionOverlay
          entityType="project"
          entityId={project.id}
          field={overlayField}
          onCreated={() => {
            // useEntityActions will refetch via WebSocket events
          }}
          onClose={() => setOverlayField(null)}
        />
      )}
    </DetailPageLayout>
  );
}
