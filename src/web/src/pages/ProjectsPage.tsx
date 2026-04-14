/**
 * ProjectsPage — self-contained page component.
 *
 * UI dependencies: @4lt7ab/ui only. No internal atoms/molecules/organisms.
 * Data dependencies: hooks (useProjects) and api layer.
 *
 * Same philosophy as KnowledgeBasePage — one file, all library primitives,
 * no intermediate component files.
 */

import { useEffect, useMemo, useState } from "react";
import { semantic as t, useInjectStyles, KEYFRAMES } from "@4lt7ab/ui/core";
import {
  Button,
  IconButton,
  Icon,
  ProgressBar,
  SearchInput,
  ConfirmDialog,
  FormModal,
  Field,
  Input,
  Skeleton,
  useToast,
} from "@4lt7ab/ui/ui";

import { useProjects } from "../hooks/useProjects";
import { ApiError, fetchTaskStatusCounts } from "../api";
import type { ProjectSummary } from "../types";

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
    .proj-card:hover .proj-card-arrow { transform: none; }
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusCounts = Record<string, number>;
type TaskCountMap = Record<string, { total: number; counts: StatusCounts }>;

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function HeroSection({
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
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: t.spaceMd,
      padding: `${t.space2xl} 0 ${t.spaceLg}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm }}>
        <Icon name="rocket_launch" size={28} style={{ color: t.colorActionPrimary }} />
        <h1 style={{
          margin: 0,
          fontSize: t.fontSize2xl,
          fontWeight: 700,
          fontFamily: t.fontSerif,
          color: t.colorText,
          letterSpacing: t.letterSpacingTight,
        }}>
          Projects
        </h1>
      </div>
      <p style={{
        margin: 0,
        fontSize: t.fontSizeSm,
        color: t.colorTextMuted,
        textAlign: "center",
      }}>
        {projectCount > 0
          ? `${projectCount} project${projectCount !== 1 ? "s" : ""} in flight.`
          : "No projects yet. Start something."}
      </p>
      <div style={{
        width: "100%",
        maxWidth: 480,
        display: "flex",
        gap: t.spaceSm,
        alignItems: "center",
      }}>
        {projectCount > 3 && (
          <div style={{ flex: 1 }}>
            <SearchInput
              value={search}
              onSearch={onSearchChange}
              placeholder="Filter projects..."
              debounceMs={150}
            />
          </div>
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

/** Small indicator pill showing a briefing section exists. */
function BriefingPill({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      padding: `1px ${t.spaceXs}`,
      borderRadius: t.radiusSm,
      background: `color-mix(in srgb, ${t.colorActionPrimary} 6%, transparent)`,
      border: `1px solid color-mix(in srgb, ${t.colorActionPrimary} 12%, transparent)`,
      fontSize: "0.6rem",
      fontFamily: t.fontMono,
      fontWeight: 500,
      color: `color-mix(in srgb, ${t.colorActionPrimary} 70%, ${t.colorTextMuted})`,
      letterSpacing: "0.02em",
    }}>
      <Icon name={icon} size={10} />
      {label}
    </span>
  );
}

/** Progress summary label — e.g. "3/10 done" */
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

function ProjectCardGrid({
  projects,
  taskData,
  onOpen,
  onDelete,
}: {
  projects: ProjectSummary[];
  taskData: TaskCountMap;
  onOpen: (id: string) => void;
  onDelete: (p: ProjectSummary) => void;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      gap: t.spaceMd,
    }}>
      {projects.map((project, i) => {
        const data = taskData[project.id];
        const total = data?.total ?? 0;
        const counts = data?.counts ?? {};
        const done = counts["done"] ?? 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <div
            key={project.id}
            className="proj-card"
            role="button"
            tabIndex={0}
            onClick={() => onOpen(project.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(project.id); } }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: t.spaceMd,
              padding: t.spaceLg,
              borderRadius: t.radiusLg,
              border: `1px solid ${t.colorBorder}`,
              background: t.colorSurface,
              boxShadow: t.shadowSm,
              cursor: "pointer",
              animation: `${KEYFRAMES.fadeInUp} 0.3s ease both`,
              animationDelay: `${Math.min(i * 40, 300)}ms`,
            }}
          >
            {/* Header: title + arrow */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: t.spaceSm }}>
              <div style={{ flex: 1, minWidth: 0 }}>
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
                {project.summary && (
                  <p style={{
                    margin: `${t.spaceXs} 0 0`,
                    fontSize: t.fontSizeXs,
                    color: t.colorTextMuted,
                    lineHeight: t.lineHeightRelaxed,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
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

            {/* Briefing indicators — which docs exist */}
            {(project.summary || project.has_context || project.has_requirements) && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {project.summary && (
                  <BriefingPill icon="subject" label="Summary" />
                )}
                {project.has_context && (
                  <BriefingPill icon="info" label="Context" />
                )}
                {project.has_requirements && (
                  <BriefingPill icon="checklist" label="Requirements" />
                )}
              </div>
            )}

            {/* Progress bar */}
            {total > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: t.spaceXs }}>
                <ProgressBar
                  segments={[
                    { value: counts["done"] ?? 0, color: t.colorSuccess, label: "done" },
                    { value: counts["in_progress"] ?? 0, color: t.colorWarning, label: "in progress" },
                    { value: counts["todo"] ?? 0, color: `color-mix(in srgb, ${t.colorTextMuted} 40%, transparent)`, label: "todo" },
                    { value: counts["archived"] ?? 0, color: `color-mix(in srgb, ${t.colorTextMuted} 20%, transparent)`, label: "archived" },
                  ]}
                  height={4}
                  aria-label={`${pct}% complete`}
                />
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.65rem",
                  fontFamily: t.fontMono,
                  color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)`,
                }}>
                  <span>{progressLabel(total, counts)}</span>
                  {total > 0 && <span>{pct}%</span>}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "auto",
              fontSize: "0.65rem",
              fontFamily: t.fontMono,
              color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)`,
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="checklist" size={12} />
                {total} {total === 1 ? "task" : "tasks"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm }}>
                <span>{formatRelativeDate(project.updated_at)}</span>
                <IconButton
                  icon="delete"
                  size={14}
                  aria-label={`Delete ${project.title}`}
                  onClick={(e) => { e.stopPropagation(); onDelete(project); }}
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
      <div style={{ display: "flex", flexDirection: "column", gap: t.spaceMd }}>
        <Field label="Title" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you building?"
          />
        </Field>
        <Field label="Summary">
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One-liner description (optional)"
          />
        </Field>
      </div>
    </FormModal>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// ProjectsPage
// ---------------------------------------------------------------------------

export function ProjectsPage({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  useInjectStyles(STYLES_ID, STYLES_CSS);
  const { showToast } = useToast();
  const { projects, loading, create, remove } = useProjects();

  // State
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
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

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...projects].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        (p.summary && p.summary.toLowerCase().includes(q))
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
      showToast(err instanceof ApiError ? err.message : "Failed to delete project");
    }
  }

  return (
    <div style={{
      flex: 1,
      width: "100%",
      maxWidth: 1100,
      alignSelf: "center",
      display: "flex",
      flexDirection: "column",
      padding: `0 ${t.spaceXl} ${t.space2xl}`,
      boxSizing: "border-box",
      overflowY: "auto",
      scrollbarWidth: "none" as const,
      gap: t.spaceLg,
    }}>
      {/* Hero */}
      <HeroSection
        projectCount={projects.length}
        search={search}
        onSearchChange={setSearch}
        onCreateClick={() => setShowCreate(true)}
      />

      {/* Content */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: t.spaceMd }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={180} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: t.spaceMd,
          padding: `${t.space2xl} 0`,
        }}>
          <Icon name="work" size={48} style={{ color: `color-mix(in srgb, ${t.colorTextMuted} 40%, transparent)` }} />
          <p style={{
            margin: 0,
            fontSize: t.fontSizeSm,
            color: t.colorTextMuted,
            textAlign: "center",
            maxWidth: 320,
            lineHeight: t.lineHeightRelaxed,
          }}>
            {search
              ? "No projects match that search."
              : "Nothing here yet. Create your first project to get started."}
          </p>
          {!search && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Icon name="add" size={15} />
              New Project
            </Button>
          )}
        </div>
      ) : (
        <ProjectCardGrid
          projects={filtered}
          taskData={taskData}
          onOpen={onOpenProject}
          onDelete={setDeleteTarget}
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
              showToast(err instanceof ApiError ? err.message : "Failed to create project");
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
    </div>
  );
}
