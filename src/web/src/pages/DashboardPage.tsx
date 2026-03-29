import { useState } from "react";
import {
  Button,
  Icon,
  Input,
  StatusDot,
  Badge,
  useTheme,
  ListPageLayout,
  PageHeader,
  CreateForm,
  EmptyState,
  HighlightOnChange,
} from "../components";
import { useProjects } from "../hooks";
import { useToastContext } from "../components/ToastContext";
import { ApiError } from "../api";
import type { Project } from "../types";
import { formatDate } from "../utils";

// ---------------------------------------------------------------------------
// Status color helper
// ---------------------------------------------------------------------------

function statusColor(theme: ReturnType<typeof useTheme>["theme"], status: Project["status"]): string {
  switch (status) {
    case "active": return theme.color.primary;
    case "paused": return theme.color.warning;
    case "completed": return theme.color.success;
    case "archived": return theme.color.textFaint;
  }
}

// ---------------------------------------------------------------------------
// StatusSummaryBar
// ---------------------------------------------------------------------------

function StatusSummaryBar({ projects }: { projects: Project[] }) {
  const { theme } = useTheme();
  const counts: Record<Project["status"], number> = { active: 0, paused: 0, completed: 0, archived: 0 };
  for (const p of projects) counts[p.status]++;

  const items: Array<{ status: Project["status"]; label: string }> = [
    { status: "active", label: "active" },
    { status: "paused", label: "paused" },
    { status: "completed", label: "completed" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.spacing.lg,
        height: 40,
        background: theme.color.surfaceContainerLow,
        borderRadius: theme.radius.lg,
        padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
        marginBottom: theme.spacing.xl,
      }}
    >
      {items.map((item, i) => (
        <div key={item.status} style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
          {i > 0 && (
            <div
              style={{
                width: 1,
                height: 16,
                background: theme.color.borderSubtle,
                marginRight: theme.spacing.sm,
              }}
            />
          )}
          <StatusDot color={statusColor(theme, item.status)} />
          <span
            style={{
              fontFamily: theme.font.mono,
              fontSize: theme.font.size.sm,
              color: theme.color.text,
              fontWeight: 600,
            }}
          >
            {counts[item.status]}
          </span>
          <span
            style={{
              fontSize: theme.font.size.xs,
              color: theme.color.textMuted,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

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
          opacity: project.status === "completed" ? 0.6 : project.status === "paused" ? 0.7 : 1,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = theme.color.surfaceContainerHigh; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = theme.color.surfaceContainer; }}
      >
        <StatusDot
          color={statusColor(theme, project.status)}
        />

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
          {project.name}
        </span>

        <span
          style={{
            flex: "2 1 auto",
            minWidth: 0,
            fontSize: theme.font.size.xs,
            color: theme.color.textMuted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {project.description || "\u2014"}
        </span>

        <Badge variant={project.status}>{project.status}</Badge>

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
  const { projects, createProject } = useProjects();
  const { showToast } = useToastContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createProject(name, description);
      setName("");
      setDescription("");
      setShowCreateForm(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  // Sort: active first, then paused, then completed, then archived
  const statusOrder: Record<Project["status"], number> = { active: 0, paused: 1, completed: 2, archived: 3 };
  const sorted = [...projects].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  const visible = sorted.filter((p) => p.status !== "archived");

  return (
    <ListPageLayout>
      <PageHeader
        title="Mission Control"
        subtitle="Monitor your projects and track status from a centralized dashboard."
        trailing={
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
              <Icon name="add" size={16} />
              New Project
            </span>
          </Button>
        }
        style={{ marginBottom: theme.spacing.xl }}
      />

      <CreateForm
        visible={showCreateForm}
        onCancel={() => setShowCreateForm(false)}
        onSubmit={handleCreate}
        creating={creating}
      >
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <Input
            label="Project Name"
            placeholder="e.g. Riverfront Pavilion"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <Input
            label="Description"
            placeholder="Brief description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </CreateForm>

      {visible.length > 0 && <StatusSummaryBar projects={visible} />}

      <div
        style={{
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          border: `1px solid ${theme.color.borderSubtle}`,
        }}
      >
        {visible.map((p) => (
          <ProjectTableRow
            key={p.id}
            project={p}
            onClick={() => onOpenProject(p.id)}
          />
        ))}
      </div>

      {visible.length === 0 && (
        <EmptyState
          icon="folder_open"
          message='No projects yet. Click "New Project" to get started.'
          variant="card"
        />
      )}
    </ListPageLayout>
  );
}
