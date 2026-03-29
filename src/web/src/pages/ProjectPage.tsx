import { useCallback, useState } from "react";
import {
  ActionCard,
  Badge,
  Button,
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
  ListItem,
  EmptyState,
  StatusDot,
  CreateTaskOverlay,
} from "../components";
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
  const TASK_ROLES = ["implementation", "validation"] as const;
  const { actionsMap: taskActionsMap } = useEntityActions("task", task.id);
  const [showTaskCreateOverlay, setShowTaskCreateOverlay] = useState(false);
  const [selectedTaskAction, setSelectedTaskAction] = useState<{ action: Action; entityAction: EntityAction } | null>(null);

  const taskActionEntries = TASK_ROLES
    .filter((r) => taskActionsMap[r] != null)
    .map((r) => ({ role: r, ...taskActionsMap[r]! }));
  const availableTaskRoles = TASK_ROLES.filter((r) => taskActionsMap[r] == null);

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

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
          {taskActionEntries.map((entry) => (
            <ActionCard
              key={entry.role}
              action={entry.action}
              entityAction={entry.entityAction}
              role={entry.role}
              onClick={() => setSelectedTaskAction(entry)}
            />
          ))}
          {availableTaskRoles.length > 0 && (
            <Button variant="ghost" onClick={() => setShowTaskCreateOverlay(true)}>
              + Add Action
            </Button>
          )}
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

      {showTaskCreateOverlay && availableTaskRoles.length > 0 && (
        <CreateActionOverlay
          entityType="task"
          entityId={task.id}
          availableRoles={[...availableTaskRoles]}
          onCreated={() => {
            // useEntityActions will refetch via WebSocket events
          }}
          onClose={() => setShowTaskCreateOverlay(false)}
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const PROJECT_ROLES = ["goal", "design", "requirements"] as const;
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ action: Action; entityAction: EntityAction } | null>(null);

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;

  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

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

  // Compute project action entries
  const projectActionEntries = PROJECT_ROLES
    .filter((r) => projectActionsMap[r] != null)
    .map((r) => ({ role: r, ...projectActionsMap[r]! }));
  const availableProjectRoles = PROJECT_ROLES.filter((r) => projectActionsMap[r] == null);

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
        <div style={{ marginBottom: theme.spacing.xl, display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
          {projectActionEntries.map((entry) => (
            <ActionCard
              key={entry.role}
              action={entry.action}
              entityAction={entry.entityAction}
              role={entry.role}
              onClick={() => setSelectedAction(entry)}
            />
          ))}
          {availableProjectRoles.length > 0 && (
            <Button variant="ghost" onClick={() => setShowCreateOverlay(true)}>
              + Add Action
            </Button>
          )}
        </div>

        <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: theme.spacing.md }}>
          <Stack direction="row" align="center" gap="sm">
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
          <Button variant="primary" size="sm" onClick={() => setShowCreateTask(true)}>
            Add Task
          </Button>
        </Stack>

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
            <EmptyState icon="task" message="No tasks yet." />
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

      {showCreateOverlay && project && availableProjectRoles.length > 0 && (
        <CreateActionOverlay
          entityType="project"
          entityId={project.id}
          availableRoles={[...availableProjectRoles]}
          onCreated={() => {
            // useEntityActions will refetch via WebSocket events
          }}
          onClose={() => setShowCreateOverlay(false)}
        />
      )}

      {showCreateTask && (
        <CreateTaskOverlay
          onCreated={async (summary, context, status) => {
            await addTask(summary, context, status);
          }}
          onClose={() => setShowCreateTask(false)}
        />
      )}
    </DetailPageLayout>
  );
}
