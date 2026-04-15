/**
 * ProjectsPage — mission control dashboard.
 *
 * UI dependencies: @4lt7ab/ui only. No internal atoms/molecules/organisms.
 * Data dependencies: hooks (useProjects) and api layer.
 *
 * Layout: aggregate stat cards at top, then a project grid below.
 * Each project card shows task breakdown, progress, and health indicators.
 */

import { useEffect, useMemo, useState } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import {
  Badge,
  Button,
  Card,
  IconButton,
  Icon,
  ProgressBar,
  SearchInput,
  ConfirmDialog,
  FormModal,
  Field,
  Input,
  Textarea,
  Skeleton,
  EmptyState,
  SectionLabel,
  useToast,
} from "@4lt7ab/ui/ui";

import { useProjects } from "../hooks/useProjects";
import { ApiError, fetchTaskStatusCounts } from "../api";
import type { ProjectSummary } from "../types";
import { formatRelativeDate, staggerStyle } from "../utils";
import { PageShell } from "../components/PageShell";

// ---------------------------------------------------------------------------
// Injected styles
// ---------------------------------------------------------------------------

const STYLES_ID = "projects-page-styles";
const STYLES_CSS = `
  .proj-card {
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .proj-card:hover {
    transform: translateY(-3px);
    border-color: ${t.colorBorderFocused};
    box-shadow: ${t.shadowMd};
  }
  .proj-card:hover .proj-card-title {
    color: ${t.colorActionPrimary};
  }
  .proj-card:hover .proj-card-arrow {
    opacity: 1;
    transform: translateX(0);
  }
  @media (prefers-reduced-motion: reduce) {
    .proj-card { transition: none; }
    .proj-card:hover { transform: none; }
    .proj-card:hover .proj-card-arrow { transform: none; }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusCounts = Record<string, number>;
type TaskCountMap = Record<string, { total: number; counts: StatusCounts }>;

interface AggregateStats {
  totalProjects: number;
  totalTasks: number;
  completionRate: number;
  activeTasks: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeAggregates(
  projects: ProjectSummary[],
  taskData: TaskCountMap,
): AggregateStats {
  let totalTasks = 0;
  let totalDone = 0;
  let totalActive = 0;

  for (const p of projects) {
    const data = taskData[p.id];
    if (!data) continue;
    totalTasks += data.total;
    totalDone += data.counts["done"] ?? 0;
    totalActive += data.counts["in_progress"] ?? 0;
  }

  const completionRate =
    totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  return {
    totalProjects: projects.length,
    totalTasks,
    completionRate,
    activeTasks: totalActive,
  };
}

/** Progress summary label -- e.g. "3/10 done" */
function progressLabel(total: number, counts: StatusCounts): string {
  if (total === 0) return "No tasks";
  const done = counts["done"] ?? 0;
  if (done === total) return `All ${total} done`;
  const inProgress = counts["in_progress"] ?? 0;
  const parts: string[] = [];
  if (done > 0) parts.push(`${done} done`);
  if (inProgress > 0) parts.push(`${inProgress} active`);
  if (parts.length === 0) parts.push(`${total} to do`);
  return parts.join(", ");
}

/** True if updated within the last 24 hours. */
function isRecentlyUpdated(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

interface StatCardData {
  icon: string;
  value: number | string;
  label: string;
  color: string;
}

function StatCards({
  stats,
  loading,
}: {
  stats: AggregateStats;
  loading: boolean;
}) {
  const cards: StatCardData[] = [
    {
      icon: "rocket_launch",
      value: stats.totalProjects,
      label: "Projects",
      color: t.colorActionPrimary,
    },
    {
      icon: "checklist",
      value: stats.totalTasks,
      label: "Total Tasks",
      color: t.colorInfo,
    },
    {
      icon: "pie_chart",
      value: `${stats.completionRate}%`,
      label: "Completion",
      color: t.colorSuccess,
    },
    {
      icon: "play_arrow",
      value: stats.activeTasks,
      label: "Active",
      color: t.colorWarning,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: t.spaceMd,
      }}
    >
      {cards.map((card, i) =>
        loading ? (
          <Skeleton key={i} height={96} />
        ) : (
          <Card
            key={card.label}
            variant="flat"
            padding="md"
            style={{
              display: "flex",
              alignItems: "center",
              gap: t.spaceMd,
              ...staggerStyle(i, { delayMs: 60 }),
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: t.radiusMd,
                background: `color-mix(in srgb, ${card.color} 10%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon
                name={card.icon}
                size={20}
                style={{ color: card.color }}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: t.fontSizeXl,
                  fontWeight: 700,
                  fontFamily: t.fontMono,
                  color: t.colorText,
                  lineHeight: 1,
                }}
              >
                {card.value}
              </span>
              <span
                style={{
                  fontSize: t.fontSizeXs,
                  color: t.colorTextMuted,
                  fontFamily: t.fontMono,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {card.label}
              </span>
            </div>
          </Card>
        ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header bar
// ---------------------------------------------------------------------------

function HeaderBar({
  projectCount,
  search,
  onSearchChange,
  onCreateClick,
}: {
  projectCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  onCreateClick: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: t.spaceMd,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm }}>
        <Icon
          name="rocket_launch"
          size={24}
          style={{ color: t.colorActionPrimary }}
        />
        <h1
          style={{
            margin: 0,
            fontSize: t.fontSizeXl,
            fontWeight: 700,
            fontFamily: t.fontSerif,
            color: t.colorText,
            letterSpacing: t.letterSpacingTight,
          }}
        >
          Mission Control
        </h1>
        <Badge variant="default">{projectCount}</Badge>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: t.spaceSm,
        }}
      >
        {projectCount > 3 && (
          <SearchInput
            value={search}
            onSearch={onSearchChange}
            placeholder="Filter projects..."
            debounceMs={150}
          />
        )}
        <Button size="sm" onClick={onCreateClick}>
          <Icon name="add" size={15} />
          New Project
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project cards
// ---------------------------------------------------------------------------

function StatusBreakdownBadges({ counts }: { counts: StatusCounts }) {
  const entries: Array<{
    key: string;
    label: string;
    variant: "success" | "warning" | "error" | "default" | "info";
  }> = [
    { key: "done", label: "done", variant: "success" },
    { key: "in_progress", label: "active", variant: "warning" },
    { key: "todo", label: "todo", variant: "default" },
    { key: "blocked", label: "blocked", variant: "error" },
  ];

  const visible = entries.filter((e) => (counts[e.key] ?? 0) > 0);
  if (visible.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {visible.map((e) => (
        <Badge key={e.key} variant={e.variant}>
          {counts[e.key]} {e.label}
        </Badge>
      ))}
    </div>
  );
}

function ProjectCardGrid({
  projects,
  taskData,
  onOpen,
  onDelete,
  onCopyId,
}: {
  projects: ProjectSummary[];
  taskData: TaskCountMap;
  onOpen: (id: string) => void;
  onDelete: (p: ProjectSummary) => void;
  onCopyId: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
        gap: t.spaceMd,
      }}
    >
      {projects.map((project, i) => {
        const data = taskData[project.id];
        const total = data?.total ?? 0;
        const counts = data?.counts ?? {};
        const done = counts["done"] ?? 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const recent = isRecentlyUpdated(project.updated_at);
        const docHints: string[] = [];
        if (project.has_context) docHints.push("Context");
        if (project.has_requirements) docHints.push("Requirements");

        return (
          <div
            key={project.id}
            className="proj-card"
            role="button"
            tabIndex={0}
            onClick={() => onOpen(project.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(project.id);
              }
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: t.spaceMd,
              padding: t.spaceLg,
              borderRadius: t.radiusLg,
              border: `1px solid ${t.colorBorder}`,
              background: t.colorSurfaceSolid,
              boxShadow: t.shadowSm,
              cursor: "pointer",
              ...staggerStyle(i, { delayMs: 40 }),
            }}
          >
            {/* Header: title + recent indicator + arrow */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: t.spaceSm,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: t.spaceXs,
                  }}
                >
                  <h3
                    className="proj-card-title"
                    style={{
                      margin: 0,
                      fontSize: t.fontSizeLg,
                      fontWeight: 700,
                      fontFamily: t.fontSans,
                      color: t.colorText,
                      transition: "color 0.15s",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {project.title}
                  </h3>
                  {recent && (
                    <span
                      title="Updated in the last 24h"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: t.colorSuccess,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                {project.summary && (
                  <p
                    style={{
                      margin: `${t.spaceXs} 0 0`,
                      fontSize: t.fontSizeXs,
                      color: t.colorTextMuted,
                      lineHeight: t.lineHeightRelaxed,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {project.summary}
                  </p>
                )}
              </div>
              <Icon
                name="arrow_forward"
                size={18}
                className="proj-card-arrow"
                style={{
                  color: t.colorActionPrimary,
                  opacity: 0,
                  transform: "translateX(-4px)",
                  transition: "opacity 0.2s, transform 0.2s",
                  flexShrink: 0,
                  marginTop: 4,
                }}
              />
            </div>

            {/* Task status breakdown badges */}
            {total > 0 && <StatusBreakdownBadges counts={counts} />}

            {/* Progress bar */}
            {total > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: t.spaceXs,
                }}
              >
                <ProgressBar
                  segments={[
                    {
                      value: counts["done"] ?? 0,
                      color: t.colorSuccess,
                      label: "done",
                    },
                    {
                      value: counts["in_progress"] ?? 0,
                      color: t.colorWarning,
                      label: "in progress",
                    },
                    {
                      value: counts["todo"] ?? 0,
                      color: `color-mix(in srgb, ${t.colorTextMuted} 40%, transparent)`,
                      label: "todo",
                    },
                    {
                      value: counts["archived"] ?? 0,
                      color: `color-mix(in srgb, ${t.colorTextMuted} 20%, transparent)`,
                      label: "archived",
                    },
                  ]}
                  height={4}
                  aria-label={`${pct}% complete`}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.65rem",
                    fontFamily: t.fontMono,
                    color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)`,
                  }}
                >
                  <span>{progressLabel(total, counts)}</span>
                  {total > 0 && <span>{pct}%</span>}
                </div>
              </div>
            )}

            {/* Footer: doc hints + timestamp + delete */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "auto",
                fontSize: "0.65rem",
                fontFamily: t.fontMono,
                color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: t.spaceXs,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Icon name="checklist" size={12} />
                  {total} {total === 1 ? "task" : "tasks"}
                </span>
                {docHints.length > 0 && (
                  <>
                    <span style={{ opacity: 0.4 }}>|</span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Icon name="description" size={12} />
                      {docHints.join(", ")}
                    </span>
                  </>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: t.spaceSm,
                }}
              >
                <span>{formatRelativeDate(project.updated_at)}</span>
                <IconButton
                  icon="content_copy"
                  size={14}
                  aria-label={`Copy ID for ${project.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyId(project.id);
                  }}
                />
                <IconButton
                  icon="delete"
                  size={14}
                  aria-label={`Delete ${project.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project);
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create project form
// ---------------------------------------------------------------------------

function CreateProjectForm({
  onCreate,
  onClose,
}: {
  onCreate: (input: { title: string; summary?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  return (
    <FormModal
      title="New Project"
      submitLabel="Create"
      onSubmit={async () => {
        if (!title.trim()) return;
        await onCreate({
          title: title.trim(),
          summary: summary.trim() || undefined,
        });
        onClose();
      }}
      onCancel={onClose}
      maxWidth={480}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: t.spaceMd,
        }}
      >
        <Field label="Title" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you building?"
          />
        </Field>
        <Field label="Summary">
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Describe the project goal and scope (optional)"
            rows={3}
          />
        </Field>
      </div>
    </FormModal>
  );
}

// ---------------------------------------------------------------------------
// ProjectsPage
// ---------------------------------------------------------------------------

export function ProjectsPage({
  onOpenProject,
}: {
  onOpenProject: (id: string) => void;
}) {
  useInjectStyles(STYLES_ID, STYLES_CSS);
  const { showToast } = useToast();
  const { projects, loading, create, remove } = useProjects();

  // State
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(
    null,
  );
  const [taskData, setTaskData] = useState<TaskCountMap>({});

  // Fetch task status counts
  useEffect(() => {
    if (projects.length === 0) return;
    const ids = projects.map((p) => p.id);
    fetchTaskStatusCounts(ids)
      .then((result) => {
        const map: TaskCountMap = {};
        for (const id of ids) {
          map[id] = result[id] ?? { total: 0, counts: {} };
        }
        setTaskData(map);
      })
      .catch(() => {});
  }, [projects]);

  // Compute aggregates from task data
  const stats = useMemo(
    () => computeAggregates(projects, taskData),
    [projects, taskData],
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...projects].sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.summary && p.summary.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [projects, search]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await remove([deleteTarget.id]);
      setDeleteTarget(null);
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Failed to delete project",
      );
    }
  }

  return (
    <PageShell>
      {/* Header */}
      <HeaderBar
        projectCount={projects.length}
        search={search}
        onSearchChange={setSearch}
        onCreateClick={() => setShowCreate(true)}
      />

      {/* Aggregate stat cards */}
      <StatCards stats={stats} loading={loading} />

      {/* Project grid */}
      <SectionLabel>Your Projects</SectionLabel>

      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: t.spaceMd,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={200} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={search ? "search_off" : "work"}
          message={
            search
              ? "No projects match that search."
              : "Nothing here yet. Create your first project to get started."
          }
          variant="card"
          action={
            !search ? (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Icon name="add" size={15} />
                New Project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ProjectCardGrid
          projects={filtered}
          taskData={taskData}
          onOpen={onOpenProject}
          onDelete={setDeleteTarget}
          onCopyId={(id) => {
            navigator.clipboard.writeText(id);
            showToast("Project ID copied", "success");
          }}
        />
      )}

      {/* Create form */}
      {showCreate && (
        <CreateProjectForm
          onCreate={async (fields) => {
            try {
              await create(fields);
              showToast("Project created", "success");
            } catch (err) {
              showToast(
                err instanceof ApiError
                  ? err.message
                  : "Failed to create project",
              );
              throw err;
            }
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Project"
          message={`Delete "${deleteTarget.title}" and all its tasks? This cannot be undone.`}
          variant="destructive"
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageShell>
  );
}
