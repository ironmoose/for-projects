import { useState } from "react";
import {
  Button,
  Icon,
  Input,
  useTheme,
  ListPageLayout,
  PageHeader,
  CreateEntityOverlay,
  EmptyState,
  HighlightOnChange,
} from "../components";
import { PresenceCharm } from "../components/molecules/PresenceCharm";
import { useProjects } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import type { Project } from "../types";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// ProjectTableRow
// ---------------------------------------------------------------------------

function ProjectTableRow({
  project,
  onClick,
}: {
  project: Project;
  onClick: () => void;
}) {
  const { theme } = useTheme();

  return (
    <HighlightOnChange trackValue={project.updated_at}>
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.md,
          height: theme.layout.tableRowHeight,
          padding: `0 ${theme.spacing.lg}`,
          background: theme.color.surfaceContainer,
          borderBottom: `1px solid ${theme.color.borderSubtle}`,
          cursor: "pointer",
          transition: `background ${theme.animation.duration.fast} ${theme.animation.easing.default}`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = theme.color.surfaceContainerHigh; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = theme.color.surfaceContainer; }}
      >
        <span
          style={{
            flex: "1 1 auto",
            minWidth: 0,
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

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <PresenceCharm active={project.goal != null} label="Goal" color={theme.color.success} />
          <PresenceCharm active={project.requirements != null} label="Requirements" color={theme.color.info ?? theme.color.primary} />
          <PresenceCharm active={project.design != null} label="Design" color={theme.color.tertiary} />
        </div>

        <span
          style={{
            flexShrink: 0,
            fontSize: theme.font.size.xxs,
            color: theme.color.textFaint,
            fontFamily: theme.font.mono,
            minWidth: 100,
            textAlign: "right" as const,
          }}
        >
          {formatDate(project.updated_at)}
        </span>

        <Icon name="chevron_right" size={16} style={{ color: theme.color.textFaint, flexShrink: 0 }} />
      </div>
    </HighlightOnChange>
  );
}

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------

export function DashboardPage({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { theme } = useTheme();
  const { projects, create } = useProjects();
  const { showToast } = useToastContext();
  const [title, setTitle] = useState("");
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await create(title);
      setTitle("");
      setShowCreateOverlay(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
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
        <CreateEntityOverlay
          title="Create Project"
          onSubmit={handleCreate}
          onClose={() => setShowCreateOverlay(false)}
          loading={creating}
          submitDisabled={!title.trim()}
        >
          <Input
            label="Project Title"
            placeholder="e.g. Riverfront Pavilion"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </CreateEntityOverlay>
      )}

      <div
        style={{
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          border: `1px solid ${theme.color.borderSubtle}`,
        }}
      >
        {sorted.map((p) => (
          <ProjectTableRow
            key={p.id}
            project={p}
            onClick={() => onOpenProject(p.id)}
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
    </ListPageLayout>
  );
}
