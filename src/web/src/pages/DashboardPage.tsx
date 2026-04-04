import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Icon,
  IconButton,
  ProgressBar,
  useTheme,
  ListPageLayout,
  PageHeader,
  EmptyState,
  ConfirmDialog,
} from "../components";
import type { ProgressBarSegment } from "../components";
import { CreateProjectOverlay } from "../components/organisms/CreateProjectOverlay";
import { PresenceCharm } from "../components/molecules/PresenceCharm";
import { useProjects } from "../hooks";
import { useShortcut } from "../hooks/useKeyboardShortcuts";
import { useToastContext } from "../components/ToastContext";
import { ApiError, fetchTaskStatusCounts } from "../api";
import type { ProjectSummary } from "../types";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// ProjectCard
// ---------------------------------------------------------------------------

type StatusCounts = Record<string, number>;

function ProjectCard({
  project,
  taskCount,
  statusCounts,
  onClick,
  onDelete,
}: {
  project: ProjectSummary;
  taskCount: number;
  statusCounts: StatusCounts;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Card
      hover
      variant="default"
      padding="lg"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.md,
      }}
    >
      <span
        style={{
          fontSize: theme.font.size.sm,
          fontWeight: 600,
          color: theme.color.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {project.title}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <PresenceCharm active={project.has_goal} label="Goal" color={theme.color.success} />
        <PresenceCharm active={project.has_requirements} label="Requirements" color={theme.color.info ?? theme.color.primary} />
        <PresenceCharm active={project.has_design} label="Design" color={theme.color.tertiary} />
      </div>

      {taskCount > 0 && (() => {
        const segments: ProgressBarSegment[] = [
          { value: statusCounts["done"] ?? 0, color: theme.color.success, label: "done" },
          { value: statusCounts["in_progress"] ?? 0, color: theme.color.tertiary, label: "in progress" },
          { value: statusCounts["todo"] ?? 0, color: theme.color.textMuted, label: "todo" },
          { value: statusCounts["archived"] ?? 0, color: theme.color.textFaint, label: "archived" },
        ];
        return <ProgressBar segments={segments} height={6} />;
      })()}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
          fontSize: theme.font.size.xxs,
          color: theme.color.textFaint,
        }}
      >
        <span>{taskCount} {taskCount === 1 ? "task" : "tasks"}</span>
        <span style={{ fontFamily: theme.font.mono }}>
          {formatDate(project.updated_at)}
        </span>

        <IconButton
          icon="delete"
          size={16}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete project"
          style={{ flexShrink: 0 }}
        />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------

export function DashboardPage({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { theme } = useTheme();
  const { projects, create, remove } = useProjects();
  const { showToast } = useToastContext();
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);

  // Keyboard shortcut: "n" to create new project
  useShortcut("n", "New project", () => setShowCreateOverlay(true), "Dashboard");

  async function handleCreate(fields: { title: string; goal?: string; requirements?: string; design?: string }) {
    await create(fields);
  }

  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [statusCounts, setStatusCounts] = useState<Record<string, StatusCounts>>({});

  useEffect(() => {
    if (projects.length === 0) return;
    const projectIds = projects.map((p) => p.id);
    fetchTaskStatusCounts(projectIds)
      .then((result) => {
        const counts: Record<string, number> = {};
        const statuses: Record<string, StatusCounts> = {};
        for (const id of projectIds) {
          const entry = result[id] ?? { total: 0, counts: {} };
          counts[id] = entry.total;
          statuses[id] = entry.counts;
        }
        setTaskCounts(counts);
        setStatusCounts(statuses);
      })
      .catch(() => {});
  }, [projects]);

  async function handleDeleteProject() {
    if (!deleteTarget) return;
    try {
      await remove([deleteTarget.id]);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete project");
    }
  }

  const sorted = [...projects].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <ListPageLayout>
      <PageHeader
        title="Mission Control"
        subtitle="Monitor your projects and track progress from a centralized dashboard."
        trailing={
          <Button onClick={() => setShowCreateOverlay(true)}>
            <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
              <Icon name="add" size={16} />
              New Project
            </span>
          </Button>
        }
        style={{ marginBottom: theme.spacing.xl }}
      />

      {showCreateOverlay && (
        <CreateProjectOverlay
          onCreated={handleCreate}
          onClose={() => setShowCreateOverlay(false)}
        />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: theme.spacing.lg,
        }}
      >
        {sorted.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            taskCount={taskCounts[p.id] ?? 0}
            statusCounts={statusCounts[p.id] ?? {}}
            onClick={() => onOpenProject(p.id)}
            onDelete={() => setDeleteTarget(p)}
          />
        ))}
      </div>

      {projects.length === 0 && (
        <EmptyState
          icon="folder_open"
          message='No projects yet. Click "New Project" to get started.'
          variant="card"
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </ListPageLayout>
  );
}
