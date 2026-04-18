/**
 * ProjectDetailPage — project "war room" dashboard.
 *
 * UI dependencies: @4lt7ab/ui only. No internal atoms/molecules/organisms.
 * Data dependencies: hooks (useProject, useProjectTasks) and api layer.
 *
 * Layout: header (back nav, title, stat cards, briefing panels) + a
 * Tasks / Documents segmented control that swaps the panel below.
 */

import { useEffect, useMemo, useState } from "react";
import { semantic as t, useInjectStyles, KEYFRAMES } from "@4lt7ab/ui/core";
import {
  Button,
  Icon,
  ProgressBar,
  Skeleton,
  RowSkeleton,
  SegmentedControl,
  EmptyState,
  TabStrip,
  StatCard,
  Grid,
} from "@4lt7ab/ui/ui";
import { Markdown } from "@4lt7ab/ui/content";

import { useProject } from "../hooks/useProject";
import { useProjectTasks } from "../hooks/useProjectTasks";
import type { TaskFilter } from "../hooks/useProjectTasks";
import { fetchTaskStatusCounts } from "../api";
import { staggerStyle } from "../utils";
import { PageShell } from "../components/PageShell";
import { ProjectTasksPanel } from "../components/ProjectTasksPanel";
import { ProjectDocumentsPanel } from "../components/ProjectDocumentsPanel";

// ---------------------------------------------------------------------------
// Injected styles
// ---------------------------------------------------------------------------

const STYLES_ID = "project-detail-styles";
const STYLES_CSS = `
  @media (prefers-reduced-motion: reduce) {
    .pd-stat-card, .pd-task-row { transition: none !important; animation: none !important; }
  }
`;

// ---------------------------------------------------------------------------
// Stat cards — task status breakdown
// ---------------------------------------------------------------------------

interface StatCardDef {
  label: string;
  statusKey: string;
  color: "muted" | "warning" | "success" | "error";
}

const STAT_CARD_DEFS: StatCardDef[] = [
  { label: "To Do", statusKey: "todo", color: "muted" },
  { label: "In Progress", statusKey: "in_progress", color: "warning" },
  { label: "Done", statusKey: "done", color: "success" },
  { label: "Blocked", statusKey: "blocked", color: "error" },
];

function StatusStatCards({
  statusCounts,
  blockedCount,
  loading,
}: {
  statusCounts: Record<string, number>;
  blockedCount: number;
  loading: boolean;
}) {
  return (
    <Grid minColumnWidth={140} gap="sm">
      {STAT_CARD_DEFS.map((def, i) => {
        if (loading) return <Skeleton key={def.statusKey} height={64} />;
        const value = def.statusKey === "blocked" ? blockedCount : (statusCounts[def.statusKey] ?? 0);
        return (
          <div key={def.statusKey} style={staggerStyle(i, { delayMs: 50, duration: 0.25 })}>
            <StatCard
              color={def.color}
              value={value}
              label={def.label}
              iconSize={32}
            />
          </div>
        );
      })}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Project header
// ---------------------------------------------------------------------------

function ProjectHeader({
  title,
  summary,
  context,
  requirements,
  taskTotal,
  statusCounts,
  blockedCount,
  onBack,
  onAddTask,
  statusLoading,
}: {
  title: string;
  summary: string | null;
  context: string | null;
  requirements: string | null;
  taskTotal: number;
  statusCounts: Record<string, number>;
  blockedCount: number;
  onBack: () => void;
  onAddTask: () => void;
  statusLoading: boolean;
}) {
  const done = statusCounts["done"] ?? 0;
  const pct = taskTotal > 0 ? Math.round((done / taskTotal) * 100) : 0;
  const inProgress = statusCounts["in_progress"] ?? 0;
  const todo = statusCounts["todo"] ?? 0;

  const panels: { key: string; icon: string; label: string; content: string }[] = [];
  if (summary) panels.push({ key: "summary", icon: "subject", label: "Summary", content: summary });
  if (context) panels.push({ key: "context", icon: "info", label: "Context", content: context });
  if (requirements) panels.push({ key: "requirements", icon: "checklist", label: "Requirements", content: requirements });

  const [expandedPanel, setExpandedPanel] = useState<string | null>(panels.length === 1 ? panels[0].key : null);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: t.spaceMd,
      paddingBottom: t.spaceLg,
      borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 30%, transparent)`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.spaceXs,
            border: "none",
            background: "transparent",
            color: t.colorTextMuted,
            fontSize: t.fontSizeXs,
            fontFamily: t.fontSans,
            fontWeight: 600,
            cursor: "pointer",
            padding: `${t.spaceXs} 0`,
          }}
        >
          <Icon name="arrow_back" size={14} />
          All Projects
        </button>
        <Button size="sm" onClick={onAddTask}>
          <Icon name="add" size={15} />
          Add Task
        </Button>
      </div>

      <h1 style={{
        margin: 0,
        fontSize: t.fontSize2xl,
        fontWeight: 700,
        fontFamily: t.fontSerif,
        color: t.colorText,
        letterSpacing: t.letterSpacingTight,
      }}>
        {title}
      </h1>

      {taskTotal > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: t.spaceMd, maxWidth: 480 }}>
          <div style={{ flex: 1 }}>
            <ProgressBar
              segments={[
                { value: done, color: "success" as const, label: "done" },
                { value: inProgress, color: "warning" as const, label: "in progress" },
                { value: todo, color: "muted" as const, label: "to do" },
                { value: (statusCounts["archived"] ?? 0), color: "muted" as const, label: "archived" },
              ]}
              height={4}
              aria-label={`${pct}% complete`}
            />
          </div>
          <span style={{
            fontSize: "0.65rem",
            fontFamily: t.fontMono,
            color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)`,
            flexShrink: 0,
          }}>
            {done}/{taskTotal} · {pct}%
          </span>
        </div>
      )}

      <StatusStatCards statusCounts={statusCounts} blockedCount={blockedCount} loading={statusLoading} />

      {panels.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <TabStrip
            tabs={panels.map((p) => ({ key: p.key, label: p.label, icon: p.icon }))}
            activeKey={expandedPanel}
            onChange={setExpandedPanel}
            allowDeselect
            size="sm"
          />

          {expandedPanel && (() => {
            const panel = panels.find((p) => p.key === expandedPanel);
            if (!panel) return null;
            return (
              <div style={{
                padding: `${t.spaceMd} ${t.spaceMd} ${t.spaceMd}`,
                borderLeft: `2px solid color-mix(in srgb, ${t.colorActionPrimary} 15%, transparent)`,
                marginLeft: t.spaceSm,
                animation: `${KEYFRAMES.fadeInUp} 0.2s ease both`,
              }}>
                <Markdown style={{ fontSize: t.fontSizeSm }}>
                  {panel.content}
                </Markdown>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectDetailPage
// ---------------------------------------------------------------------------

type ProjectTab = "tasks" | "documents";

export function ProjectDetailPage({
  projectId,
  onBack,
}: {
  projectId: string;
  onBack: () => void;
}) {
  useInjectStyles(STYLES_ID, STYLES_CSS);

  // Data
  const { project, notFound, loading: projectLoading, addTask, updateTask, deleteTask } = useProject(projectId);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>({ status: "in_progress,todo" });
  const [taskSearch, setTaskSearch] = useState("");
  const { tasks, total, totalPages, page, setPage, loading: tasksLoading } = useProjectTasks(projectId, taskFilter);

  // Tab state — resets per project via the projectId effect below.
  const [activeTab, setActiveTab] = useState<ProjectTab>("tasks");
  useEffect(() => { setActiveTab("tasks"); }, [projectId]);

  // Status counts for the header (all tasks, not just the current page).
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [statusCountsLoading, setStatusCountsLoading] = useState(true);
  useEffect(() => {
    if (!project) return;
    setStatusCountsLoading(true);
    fetchTaskStatusCounts([projectId]).then((r) => {
      setStatusCounts(r[projectId]?.counts ?? {});
    }).catch(() => {}).finally(() => setStatusCountsLoading(false));
  }, [projectId, project, tasks]);

  const allTaskTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // blockedCount is an approximation (current page only). Preserves pre-extraction behavior.
  const blockedCount = useMemo(() => tasks.filter((t) => t.is_blocked).length, [tasks]);

  // Shared "Add Task" button in the header — opens the create modal inside ProjectTasksPanel
  // and switches to the Tasks tab if the user is on Documents.
  const [showCreate, setShowCreate] = useState(false);
  function handleAddTaskClick() {
    setActiveTab("tasks");
    setShowCreate(true);
  }

  if (projectLoading && !project) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 960, alignSelf: "center", padding: `${t.space2xl} ${t.spaceXl}` }}>
        <Skeleton height={32} width="40%" />
        <div style={{ marginTop: t.spaceLg }}><Skeleton height={16} width="70%" /></div>
        <div style={{ marginTop: t.spaceMd, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: t.spaceSm }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={64} />)}
        </div>
        <div style={{ marginTop: t.spaceXl, display: "flex", flexDirection: "column", gap: 1 }}>
          {Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 960, alignSelf: "center", padding: `${t.space2xl} ${t.spaceXl}`, display: "flex", flexDirection: "column", alignItems: "center", gap: t.spaceMd }}>
        <EmptyState icon="error" message="Project not found." />
        <Button size="sm" variant="ghost" onClick={onBack}>Back to projects</Button>
      </div>
    );
  }

  if (!project) return null;

  // Derived labels for the segmented control — count only shown for Documents
  // since Tasks already has a full status-card breakdown in the header.
  const documentCount = project.documents?.length ?? 0;
  const projectTabs: { value: ProjectTab; label: string; icon: string }[] = [
    { value: "tasks", label: "Tasks", icon: "checklist" },
    {
      value: "documents",
      label: documentCount > 0 ? `Documents · ${documentCount}` : "Documents",
      icon: "description",
    },
  ];

  return (
    <PageShell maxWidth={960}>
      <ProjectHeader
        title={project.title}
        summary={project.summary}
        context={project.context}
        requirements={project.requirements}
        taskTotal={allTaskTotal}
        statusCounts={statusCounts}
        blockedCount={blockedCount}
        onBack={onBack}
        onAddTask={handleAddTaskClick}
        statusLoading={statusCountsLoading && Object.keys(statusCounts).length === 0}
      />

      {/* Tasks / Documents switch */}
      <nav
        aria-label="Project section"
        style={{ display: "flex", justifyContent: "flex-start" }}
        data-testid="project-tab-switch"
      >
        <SegmentedControl
          size="sm"
          segments={projectTabs}
          value={activeTab}
          onChange={(v) => setActiveTab(v as ProjectTab)}
        />
      </nav>

      {activeTab === "tasks" ? (
        <ProjectTasksPanel
          projectId={projectId}
          tasks={tasks}
          total={total}
          totalPages={totalPages}
          page={page}
          setPage={setPage}
          tasksLoading={tasksLoading}
          taskFilter={taskFilter}
          setTaskFilter={setTaskFilter}
          taskSearch={taskSearch}
          setTaskSearch={setTaskSearch}
          showCreate={showCreate}
          setShowCreate={setShowCreate}
          addTask={addTask}
          updateTask={updateTask}
          deleteTask={deleteTask}
        />
      ) : (
        <ProjectDocumentsPanel references={project.documents ?? []} />
      )}
    </PageShell>
  );
}
