import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Icon,
  IconButton,
  Input,
  Markdown,
  Select,
  Stack,
  TopBar,
  ToastContainer,
  useTheme,
  useToast,
} from "./components";
import type { NavItem, ToastType } from "./components";
import { apiFetch, ApiError } from "./api";
import { useRealtimeEvents, type DomainEvent } from "./useRealtimeEvents";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: "active" | "paused" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

type TaskType = "research" | "implementation" | "review" | "design" | "planning" | "testing" | "documentation";
type TaskEffort = "trivial" | "low" | "moderate" | "high" | "extreme";

interface Task {
  id: string;
  project_id: string;
  number: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  type: TaskType | null;
  effort: TaskEffort | null;
  priority: number | null;
  created_at: string;
  updated_at: string;
}

interface Tag {
  id: string;
  name: string;
  prefix: string | null;
  created_at: string;
}

interface Workbench {
  id: string;
  goal: string;
  created_at: string;
  updated_at: string;
}

interface Instruction {
  id: string;
  workbench_id: string;
  prompt: string;
  output: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

type BindingKind = "input" | "output" | "context";

interface InstructionBinding {
  id: string;
  instruction_id: string;
  arn: string;
  kind: BindingKind;
  created_at: string;
  updated_at: string;
}

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

// ---------------------------------------------------------------------------
// Simple hash router
// ---------------------------------------------------------------------------

function useHashRoute(): { path: string; navigate: (to: string) => void } {
  const [path, setPath] = useState(() => window.location.hash.slice(1) || "/");

  useEffect(() => {
    function onHashChange() {
      setPath(window.location.hash.slice(1) || "/");
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(to: string) {
    window.location.hash = to;
  }

  return { path, navigate };
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const navItems: NavItem[] = [
  { label: "Projects", path: "/" },
  { label: "Workbenches", path: "/workbenches" },
];

export function App() {
  const { theme } = useTheme();
  const { path, navigate } = useHashRoute();
  const { toasts, showToast, dismiss } = useToast();

  // Match /projects/:slug
  const projectSlugMatch = path.match(/^\/projects\/([^/]+)$/);
  const projectSlug = projectSlugMatch?.[1] ?? null;

  // Match /workbenches/:id
  const workbenchIdMatch = path.match(/^\/workbenches\/([^/]+)$/);
  const workbenchId = workbenchIdMatch?.[1] ?? null;

  // Real-time event listeners from child views
  const eventListenersRef = useRef(new Set<(e: DomainEvent) => void>());

  const onEvent = useCallback((event: DomainEvent) => {
    for (const fn of eventListenersRef.current) fn(event);
  }, []);

  const { connected } = useRealtimeEvents(onEvent);

  const subscribeEvents = useCallback((fn: (e: DomainEvent) => void) => {
    eventListenersRef.current.add(fn);
    return () => { eventListenersRef.current.delete(fn); };
  }, []);

  // Determine active nav path for highlighting
  const activePath = path.startsWith("/workbenches") ? "/workbenches" : "/";

  function renderView() {
    if (projectSlug) {
      return <ProjectView slug={projectSlug} onBack={() => navigate("/")} subscribeEvents={subscribeEvents} showToast={showToast} />;
    }
    if (workbenchId) {
      return <WorkbenchView id={workbenchId} onBack={() => navigate("/workbenches")} subscribeEvents={subscribeEvents} showToast={showToast} />;
    }
    if (path.startsWith("/workbenches")) {
      return <WorkbenchesView onOpenWorkbench={(id) => navigate(`/workbenches/${id}`)} subscribeEvents={subscribeEvents} showToast={showToast} />;
    }
    return <DashboardView onOpenProject={(slug) => navigate(`/projects/${slug}`)} subscribeEvents={subscribeEvents} showToast={showToast} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: theme.font.body }}>
      <TopBar
        trailing={<ConnectionIndicator connected={connected} />}
        navItems={navItems}
        activePath={activePath}
        onNavigate={navigate}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
        {renderView()}
      </main>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConnectionIndicator
// ---------------------------------------------------------------------------

function ConnectionIndicator({ connected }: { connected: boolean }) {
  const { theme } = useTheme();
  return (
    <span
      title={connected ? "Live updates active" : "Reconnecting..."}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: theme.radius.full,
        background: connected ? theme.color.success : theme.color.textFaint,
        transition: "background 0.3s",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// DashboardView
// ---------------------------------------------------------------------------

function DashboardView({ onOpenProject, subscribeEvents, showToast }: { onOpenProject: (slug: string) => void; subscribeEvents: (fn: (e: DomainEvent) => void) => () => void; showToast: (message: string, type?: ToastType) => void }) {
  const { theme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchProjectsRef = useRef<(() => void) | undefined>(undefined);

  async function fetchProjects() {
    try {
      const res = await apiFetch("/api/projects");
      const body = await res.json();
      setProjects(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load projects");
    }
  }

  fetchProjectsRef.current = fetchProjects;

  useEffect(() => {
    fetchProjects();
    return subscribeEvents((event) => {
      if (event.entity === "project") fetchProjectsRef.current?.();
    });
  }, [subscribeEvents]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description }),
      });
      setName("");
      setSlug("");
      setDescription("");
      setShowCreateForm(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 1400,
        padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`,
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      {/* Page header */}
      <Stack direction="row" justify="space-between" align="flex-end" wrap style={{ marginBottom: theme.spacing.xl, gap: theme.spacing.lg }}>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: theme.font.headline,
              fontSize: theme.font.size.xl,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: theme.color.text,
            }}
          >
            Workspace Overview
          </h2>
          <p
            style={{
              margin: `${theme.spacing.xs} 0 0`,
              color: theme.color.textMuted,
              fontSize: theme.font.size.sm,
            }}
          >
            Manage your active projects and track progress from a centralized view.
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
            <Icon name="add" size={16} />
            New Project
          </span>
        </Button>
      </Stack>

      {/* Create form (toggled) */}
      {showCreateForm && (
        <Card variant="default" padding="lg" style={{ marginBottom: theme.spacing.xl }}>
          <form onSubmit={handleCreate}>
            <Stack direction="row" gap="sm" align="flex-end" wrap>
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
                  label="Slug"
                  placeholder="e.g. riverfront-pavilion"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
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
              <Stack direction="row" gap="sm">
                <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create"}</Button>
                <Button variant="ghost" onClick={() => setShowCreateForm(false)} type="button">
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </form>
        </Card>
      )}

      {/* Project cards */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: theme.spacing.lg,
        }}
      >
        {projects.map((p) => (
          <div
            key={p.id}
            style={{ flex: `1 1 calc(50% - ${theme.spacing.lg})`, maxWidth: "100%", minWidth: 280, cursor: "pointer" }}
            onClick={() => onOpenProject(p.slug)}
          >
            <ProjectCard project={p} />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <Card variant="flat" padding="2xl">
          <Stack align="center" gap="lg">
            <Icon name="folder_open" size={40} style={{ color: theme.color.textFaint }} />
            <p
              style={{
                margin: 0,
                color: theme.color.textMuted,
                fontSize: theme.font.size.sm,
              }}
            >
              No projects yet. Click "New Project" to get started.
            </p>
          </Stack>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectCard
// ---------------------------------------------------------------------------

function ProjectCard({
  project: p,
}: {
  project: Project;
}) {
  const { theme } = useTheme();
  const isCompleted = p.status === "completed";
  const date = new Date(p.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Card
      variant="default"
      padding="lg"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        borderLeft: isCompleted ? `3px solid ${theme.color.primary}` : undefined,
        transition: "box-shadow 0.2s",
      }}
    >
      {/* Badge */}
      <div style={{ marginBottom: theme.spacing.md }}>
        <Badge variant={p.status}>{p.status}</Badge>
      </div>

      {/* Title + description */}
      <h3
        style={{
          margin: 0,
          fontFamily: theme.font.headline,
          fontSize: theme.font.size.lg,
          fontWeight: 700,
          color: theme.color.text,
          marginBottom: theme.spacing.xs,
        }}
      >
        {p.name}
      </h3>
      {p.description && (
        <p
          style={{
            margin: `0 0 ${theme.spacing.lg}`,
            fontSize: theme.font.size.xs,
            color: theme.color.textMuted,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {p.description}
        </p>
      )}

      {/* Bottom: meta */}
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: "0.625rem",
            fontWeight: 500,
            color: theme.color.textFaint,
          }}
        >
          <Icon name="calendar_today" size={12} />
          {date}
        </span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ProjectView — full project detail page reached via /projects/:slug
// ---------------------------------------------------------------------------

const taskStatusOptions = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

function ProjectView({ slug, onBack, subscribeEvents, showToast }: { slug: string; onBack: () => void; subscribeEvents: (fn: (e: DomainEvent) => void) => () => void; showToast: (message: string, type?: ToastType) => void }) {
  const { theme } = useTheme();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;

  const slugRef = useRef(slug);
  slugRef.current = slug;

  async function fetchProject() {
    try {
      const res = await apiFetch(`/api/projects/${encodeURIComponent(slug)}`);
      const p: Project = await res.json();
      setProject(p);
      fetchTasks(p.slug);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        showToast(err instanceof ApiError ? err.message : "Failed to load project");
      }
    }
  }

  async function fetchTasks(projectSlug: string) {
    try {
      const res = await apiFetch(`/api/projects/${encodeURIComponent(projectSlug)}/tasks`);
      const body = await res.json();
      setTasks(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load tasks");
    }
  }

  const fetchProjectRef = useRef(fetchProject);
  fetchProjectRef.current = fetchProject;

  useEffect(() => {
    setNotFound(false);
    setProject(null);
    setTasks([]);
    setSelectedTaskId(null);
    fetchProject();

    return subscribeEvents((event) => {
      if (event.entity === "project" || event.entity === "task") {
        fetchProjectRef.current();
      }
    });
  }, [slug, subscribeEvents]);

  async function handleStatusChange(status: Project["status"]) {
    if (!project) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(project.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update project status");
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !project) return;
    setAddingTask(true);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(project.slug)}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle }),
      });
      setNewTaskTitle("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add task");
    } finally {
      setAddingTask(false);
    }
  }

  async function handleTaskStatusChange(taskId: string, status: Task["status"]) {
    if (!project) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(project.slug)}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to update task");
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!project) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(project.slug)}/tasks/${taskId}`, { method: "DELETE" });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete task");
    }
  }

  if (notFound) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 900, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box" }}>
        <Button variant="ghost" onClick={onBack}>
          <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
            <Icon name="arrow_back" size={16} /> Back
          </span>
        </Button>
        <Card variant="flat" padding="2xl" style={{ marginTop: theme.spacing.xl }}>
          <Stack align="center" gap="lg">
            <Icon name="error_outline" size={40} style={{ color: theme.color.textFaint }} />
            <p style={{ margin: 0, color: theme.color.textMuted, fontSize: theme.font.size.sm }}>
              Project not found.
            </p>
          </Stack>
        </Card>
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

  const todo = tasks.filter((t) => t.status === "todo");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        maxWidth: selectedTask ? 1800 : 900,
        display: "flex",
        gap: theme.spacing.xl,
        boxSizing: "border-box",
        transition: "max-width 0.25s ease",
      }}
    >
    <div style={{ flex: 1, minWidth: 0, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box", overflowY: "auto" }}>
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} style={{ marginBottom: theme.spacing.lg }}>
        <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
          <Icon name="arrow_back" size={16} /> All Projects
        </span>
      </Button>

      {/* Project header */}
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
              letterSpacing: "-0.02em",
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
          onChange={(e) => handleStatusChange(e.target.value as Project["status"])}
          options={statusOptions}
        />
      </Stack>

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

      {/* Add task */}
      <form onSubmit={handleAddTask} style={{ marginBottom: theme.spacing.xl }}>
        <Stack direction="row" gap="xs" align="flex-end">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Input
              placeholder="Add a task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={addingTask}>
            <Icon name={addingTask ? "hourglass_empty" : "add"} size={16} />
          </Button>
        </Stack>
      </form>

      {/* Task groups */}
      <Stack gap="lg">
        {[
          { label: "To Do", items: todo, icon: "radio_button_unchecked" },
          { label: "In Progress", items: inProgress, icon: "pending" },
          { label: "Done", items: done, icon: "check_circle" },
        ].map(
          (group) => (
              <div key={group.label}>
                <Stack direction="row" align="center" gap="xs" style={{ marginBottom: theme.spacing.sm }}>
                  <Icon name={group.icon} size={14} style={{ color: theme.color.textFaint }} />
                  <span
                    style={{
                      fontSize: "0.625rem",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: theme.color.textFaint,
                    }}
                  >
                    {group.label} ({group.items.length})
                  </span>
                </Stack>
                <Stack gap="xs">
                  {group.items.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      style={{
                        background: theme.color.surfaceContainer,
                        borderRadius: theme.radius.lg,
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = theme.color.surfaceContainerHigh)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = theme.color.surfaceContainer)}
                    >
                      <Stack direction="row" justify="space-between" align="center" gap="xs">
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: theme.font.size.sm,
                            color: task.status === "done" ? theme.color.textFaint : theme.color.text,
                            textDecoration: task.status === "done" ? "line-through" : undefined,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            gap: theme.spacing.xs,
                          }}
                        >
                          <span style={{ color: theme.color.textFaint, fontFamily: "monospace", fontSize: theme.font.size.xs, flexShrink: 0 }}>
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
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value as Task["status"])}
                            options={taskStatusOptions}
                            style={{ fontSize: "0.625rem", padding: "0.1rem 0.25rem" }}
                          />
                          <IconButton
                            icon="close"
                            size={12}
                            onClick={() => handleDeleteTask(task.id)}
                            style={{ color: theme.color.textFaint, width: 18, height: 18 }}
                          />
                        </Stack>
                      </Stack>
                    </div>
                  ))}
                </Stack>
              </div>
            )
        )}
        {tasks.length === 0 && (
          <p style={{ margin: 0, fontSize: theme.font.size.sm, color: theme.color.textFaint, textAlign: "center" }}>
            No tasks yet. Add one above.
          </p>
        )}
      </Stack>
    </div>

    {/* Task detail panel */}
    {selectedTask && (
      <TaskDetailPanel
        task={selectedTask}
        projectSlug={slug}
        onClose={() => setSelectedTaskId(null)}
        showToast={showToast}
      />
    )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskDetailPanel — slide-over detail view for a single task
// ---------------------------------------------------------------------------


const statusLabel: Record<Task["status"], string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

const SMALL_BREAKPOINT = 768;

function TaskDetailPanel({ task, projectSlug, onClose, showToast }: { task: Task; projectSlug: string; onClose: () => void; showToast: (message: string, type?: ToastType) => void }) {
  const { theme } = useTheme();
  const windowWidth = useWindowWidth();
  const isSmall = windowWidth < SMALL_BREAKPOINT;
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  useEffect(() => {
    fetchTags();
  }, [task.id]);

  async function fetchTags() {
    try {
      const res = await apiFetch(`/api/projects/${encodeURIComponent(projectSlug)}/tasks/${task.id}/tags`);
      const body = await res.json();
      setTags(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load tags");
    }
  }

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setAddingTag(true);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(projectSlug)}/tasks/${task.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim().toLowerCase() }),
      });
      setNewTagName("");
      fetchTags();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add tag");
    } finally {
      setAddingTag(false);
    }
  }

  async function handleRemoveTag(tagId: string) {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(projectSlug)}/tasks/${task.id}/tags/${tagId}`, { method: "DELETE" });
      fetchTags();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to remove tag");
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const panel = (
      <div
        style={{
          ...(isSmall
            ? { position: "fixed" as const, inset: 0, zIndex: 101 }
            : { flex: "1 0 400px", maxWidth: 640, alignSelf: "stretch" }),
          borderLeft: isSmall ? undefined : `1px solid ${theme.color.borderSubtle}`,
          background: isSmall ? theme.color.surface : theme.color.surfaceContainerLow,
          display: "flex",
          flexDirection: "column" as const,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`,
            borderBottom: `1px solid ${theme.color.borderSubtle}`,
          }}
        >
          <Stack direction="row" justify="space-between" align="flex-start" gap="sm">
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Status indicator */}
              <Stack direction="row" align="center" gap="xs" style={{ marginBottom: theme.spacing.sm }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: theme.radius.full,
                    background: task.status === "done" ? theme.color.success : task.status === "in_progress" ? theme.color.tertiary : theme.color.textFaint,
                  }}
                />
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

              {/* Title */}
              <h2
                style={{
                  margin: 0,
                  fontFamily: theme.font.headline,
                  fontSize: theme.font.size.xl,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: theme.color.text,
                  lineHeight: 1.3,
                }}
              >
                <span style={{ color: theme.color.textFaint, fontFamily: "monospace", fontWeight: 500, fontSize: theme.font.size.sm }}>
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
            <IconButton icon="close" size={18} onClick={onClose} />
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
          {/* Description */}
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
            <span
              style={{
                display: "block",
                fontSize: "0.625rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: theme.color.textFaint,
                marginBottom: theme.spacing.sm,
              }}
            >
              Tags
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: theme.font.size.xs,
                    color: theme.color.primary,
                    background: theme.color.surfaceContainerHigh,
                    borderRadius: theme.radius.full,
                    padding: "2px 8px",
                  }}
                >
                  {tag.prefix ? (
                    <>
                      <span style={{ color: theme.color.textFaint, fontWeight: 600 }}>{tag.prefix}:</span>
                      {tag.name.slice(tag.prefix.length + 1)}
                    </>
                  ) : (
                    tag.name
                  )}
                  <IconButton
                    icon="close"
                    size={12}
                    onClick={() => handleRemoveTag(tag.id)}
                    style={{ width: 16, height: 16, minWidth: 16 }}
                  />
                </span>
              ))}
              {tags.length === 0 && (
                <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint, fontStyle: "italic" }}>
                  No tags
                </span>
              )}
            </div>
            <form onSubmit={handleAddTag} style={{ display: "flex", gap: theme.spacing.xs }}>
              <Input
                placeholder="Add tag..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                style={{ flex: 1, fontSize: theme.font.size.xs, padding: "2px 6px" }}
              />
              <Button type="submit" size="sm" disabled={addingTag} style={{ fontSize: theme.font.size.xs, padding: "2px 8px" }}>
                {addingTag ? "…" : "Add"}
              </Button>
            </form>
          </div>

          {/* Metadata */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: theme.spacing.xl,
              borderTop: `1px solid ${theme.color.borderSubtle}`,
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: "0.625rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: theme.color.textFaint,
                marginBottom: theme.spacing.sm,
              }}
            >
              Metadata
            </span>
            <Stack gap="xs">
              {[
                { label: "Number", value: `#${task.number}` },
                { label: "ID", value: task.id },
                { label: "Type", value: task.type ?? "—" },
                { label: "Effort", value: task.effort ?? "—" },
                { label: "Priority", value: task.priority != null ? `${task.priority}` : "—" },
                { label: "Created", value: formatDate(task.created_at) },
                { label: "Updated", value: formatDate(task.updated_at) },
              ].map((row) => (
                <Stack key={row.label} direction="row" justify="space-between" align="center">
                  <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint }}>{row.label}</span>
                  <span
                    style={{
                      fontSize: theme.font.size.xs,
                      color: theme.color.textMuted,
                      fontFamily: "monospace",
                      textAlign: "right",
                    }}
                  >
                    {row.value}
                  </span>
                </Stack>
              ))}
            </Stack>
          </div>
        </div>
      </div>
  );

  if (isSmall) {
    return (
      <>
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }}
        />
        {panel}
      </>
    );
  }

  return panel;
}

// ---------------------------------------------------------------------------
// WorkbenchesView — list all workbenches, create new ones
// ---------------------------------------------------------------------------

function WorkbenchesView({
  onOpenWorkbench,
  subscribeEvents,
  showToast,
}: {
  onOpenWorkbench: (id: string) => void;
  subscribeEvents: (fn: (e: DomainEvent) => void) => () => void;
  showToast: (message: string, type?: ToastType) => void;
}) {
  const { theme } = useTheme();
  const [workbenches, setWorkbenches] = useState<Workbench[]>([]);
  const [goal, setGoal] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchRef = useRef<(() => void) | undefined>(undefined);

  async function fetchWorkbenches() {
    try {
      const res = await apiFetch("/api/workbenches");
      const body = await res.json();
      setWorkbenches(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load workbenches");
    }
  }

  fetchRef.current = fetchWorkbenches;

  useEffect(() => {
    fetchWorkbenches();
    return subscribeEvents((event) => {
      if (event.entity === "workbench") fetchRef.current?.();
    });
  }, [subscribeEvents]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/workbenches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      setGoal("");
      setShowCreateForm(false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to create workbench");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 1400,
        padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`,
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      {/* Page header */}
      <Stack direction="row" justify="space-between" align="flex-end" wrap style={{ marginBottom: theme.spacing.xl, gap: theme.spacing.lg }}>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: theme.font.headline,
              fontSize: theme.font.size.xl,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: theme.color.text,
            }}
          >
            Workbenches
          </h2>
          <p
            style={{
              margin: `${theme.spacing.xs} 0 0`,
              color: theme.color.textMuted,
              fontSize: theme.font.size.sm,
            }}
          >
            Orchestrate instructions and bind them to resources.
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
            <Icon name="add" size={16} />
            New Workbench
          </span>
        </Button>
      </Stack>

      {/* Create form */}
      {showCreateForm && (
        <Card variant="default" padding="lg" style={{ marginBottom: theme.spacing.xl }}>
          <form onSubmit={handleCreate}>
            <Stack direction="row" gap="sm" align="flex-end" wrap>
              <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                <Input
                  label="Goal"
                  placeholder="What is this workbench for?"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  required
                />
              </div>
              <Stack direction="row" gap="sm">
                <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create"}</Button>
                <Button variant="ghost" onClick={() => setShowCreateForm(false)} type="button">
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </form>
        </Card>
      )}

      {/* Workbench cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.lg }}>
        {workbenches.map((wb) => (
          <div
            key={wb.id}
            style={{ flex: `1 1 calc(50% - ${theme.spacing.lg})`, maxWidth: "100%", minWidth: 280, cursor: "pointer" }}
            onClick={() => onOpenWorkbench(wb.id)}
          >
            <WorkbenchCard workbench={wb} />
          </div>
        ))}
      </div>

      {workbenches.length === 0 && (
        <Card variant="flat" padding="2xl">
          <Stack align="center" gap="lg">
            <Icon name="construction" size={40} style={{ color: theme.color.textFaint }} />
            <p style={{ margin: 0, color: theme.color.textMuted, fontSize: theme.font.size.sm }}>
              No workbenches yet. Click "New Workbench" to get started.
            </p>
          </Stack>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkbenchCard
// ---------------------------------------------------------------------------

function WorkbenchCard({ workbench: wb }: { workbench: Workbench }) {
  const { theme } = useTheme();
  const date = new Date(wb.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <Card
      variant="default"
      padding="lg"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        transition: "box-shadow 0.2s",
      }}
    >
      <Icon name="construction" size={18} style={{ color: theme.color.primary, marginBottom: theme.spacing.sm }} />
      <h3
        style={{
          margin: 0,
          fontFamily: theme.font.headline,
          fontSize: theme.font.size.lg,
          fontWeight: 700,
          color: theme.color.text,
          marginBottom: theme.spacing.xs,
          lineHeight: 1.4,
        }}
      >
        {wb.goal}
      </h3>
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: "0.6rem",
            fontFamily: "monospace",
            color: theme.color.textFaint,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "60%",
          }}
        >
          {wb.id}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.625rem", fontWeight: 500, color: theme.color.textFaint }}>
          <Icon name="calendar_today" size={12} />
          {date}
        </span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// WorkbenchView — detail view for a single workbench with instructions
// ---------------------------------------------------------------------------

function WorkbenchView({
  id,
  onBack,
  subscribeEvents,
  showToast,
}: {
  id: string;
  onBack: () => void;
  subscribeEvents: (fn: (e: DomainEvent) => void) => () => void;
  showToast: (message: string, type?: ToastType) => void;
}) {
  const { theme } = useTheme();
  const [workbench, setWorkbench] = useState<Workbench | null>(null);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [selectedInstructionId, setSelectedInstructionId] = useState<string | null>(null);
  const [addingInstruction, setAddingInstruction] = useState(false);

  const selectedInstruction = selectedInstructionId ? instructions.find((i) => i.id === selectedInstructionId) ?? null : null;

  const idRef = useRef(id);
  idRef.current = id;

  async function fetchWorkbench() {
    try {
      const res = await apiFetch(`/api/workbenches/${encodeURIComponent(id)}`);
      const wb: Workbench = await res.json();
      setWorkbench(wb);
      fetchInstructions();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        showToast(err instanceof ApiError ? err.message : "Failed to load workbench");
      }
    }
  }

  async function fetchInstructions() {
    try {
      const res = await apiFetch(`/api/workbenches/${encodeURIComponent(idRef.current)}/instructions`);
      const body = await res.json();
      setInstructions(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load instructions");
    }
  }

  const fetchRef = useRef(fetchWorkbench);
  fetchRef.current = fetchWorkbench;

  useEffect(() => {
    setNotFound(false);
    setWorkbench(null);
    setInstructions([]);
    setSelectedInstructionId(null);
    fetchWorkbench();

    return subscribeEvents((event) => {
      if (event.entity === "workbench" || event.entity === "instruction" || event.entity === "instruction_binding") {
        fetchRef.current();
      }
    });
  }, [id, subscribeEvents]);

  async function handleAddInstruction(e: React.FormEvent) {
    e.preventDefault();
    if (!newPrompt.trim()) return;
    setAddingInstruction(true);
    try {
      await apiFetch(`/api/workbenches/${encodeURIComponent(id)}/instructions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: newPrompt }),
      });
      setNewPrompt("");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add instruction");
    } finally {
      setAddingInstruction(false);
    }
  }

  async function handleDeleteInstruction(instructionId: string) {
    try {
      await apiFetch(`/api/workbenches/${encodeURIComponent(id)}/instructions/${instructionId}`, { method: "DELETE" });
      if (selectedInstructionId === instructionId) setSelectedInstructionId(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to delete instruction");
    }
  }

  if (notFound) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 900, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box" }}>
        <Button variant="ghost" onClick={onBack}>
          <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
            <Icon name="arrow_back" size={16} /> Back
          </span>
        </Button>
        <Card variant="flat" padding="2xl" style={{ marginTop: theme.spacing.xl }}>
          <Stack align="center" gap="lg">
            <Icon name="error_outline" size={40} style={{ color: theme.color.textFaint }} />
            <p style={{ margin: 0, color: theme.color.textMuted, fontSize: theme.font.size.sm }}>Workbench not found.</p>
          </Stack>
        </Card>
      </div>
    );
  }

  if (!workbench) {
    return (
      <div style={{ flex: 1, width: "100%", maxWidth: 900, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box" }}>
        <p style={{ color: theme.color.textMuted, fontSize: theme.font.size.sm }}>Loading...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        width: "100%",
        maxWidth: selectedInstruction ? 1800 : 900,
        display: "flex",
        gap: theme.spacing.xl,
        boxSizing: "border-box",
        transition: "max-width 0.25s ease",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, padding: `${theme.spacing["2xl"]} ${theme.spacing.xl}`, boxSizing: "border-box", overflowY: "auto" }}>
        {/* Back button */}
        <Button variant="ghost" onClick={onBack} style={{ marginBottom: theme.spacing.lg }}>
          <span style={{ display: "flex", alignItems: "center", gap: theme.spacing.xs }}>
            <Icon name="arrow_back" size={16} /> All Workbenches
          </span>
        </Button>

        {/* Workbench header */}
        <div style={{ marginBottom: theme.spacing.xl }}>
          <Stack direction="row" align="center" gap="xs" style={{ marginBottom: theme.spacing.sm }}>
            <Icon name="construction" size={18} style={{ color: theme.color.primary }} />
            <span style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted, fontFamily: "monospace" }}>{workbench.id}</span>
          </Stack>
          <h2
            style={{
              margin: 0,
              fontFamily: theme.font.headline,
              fontSize: theme.font.size.xl,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: theme.color.text,
            }}
          >
            {workbench.goal}
          </h2>
        </div>

        {/* Instructions header */}
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
            Instructions
          </h3>
          <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint }}>
            {instructions.length} instruction{instructions.length !== 1 ? "s" : ""}
          </span>
        </Stack>

        {/* Add instruction */}
        <form onSubmit={handleAddInstruction} style={{ marginBottom: theme.spacing.xl }}>
          <Stack direction="row" gap="xs" align="flex-end">
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input
                placeholder="Add an instruction..."
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" disabled={addingInstruction}>
              <Icon name={addingInstruction ? "hourglass_empty" : "add"} size={16} />
            </Button>
          </Stack>
        </form>

        {/* Instruction list */}
        <Stack gap="xs">
          {instructions.map((inst) => (
            <div
              key={inst.id}
              onClick={() => setSelectedInstructionId(inst.id)}
              style={{
                background: selectedInstructionId === inst.id ? theme.color.surfaceContainerHigh : theme.color.surfaceContainer,
                borderRadius: theme.radius.lg,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (selectedInstructionId !== inst.id) e.currentTarget.style.background = theme.color.surfaceContainerHigh;
              }}
              onMouseLeave={(e) => {
                if (selectedInstructionId !== inst.id) e.currentTarget.style.background = theme.color.surfaceContainer;
              }}
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
                    display: "flex",
                    alignItems: "center",
                    gap: theme.spacing.xs,
                  }}
                >
                  <span style={{ color: theme.color.textFaint, fontFamily: "monospace", fontSize: theme.font.size.xs, flexShrink: 0 }}>
                    {inst.position}
                  </span>
                  {inst.prompt}
                </span>
                <Stack direction="row" gap="xs" style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    icon="close"
                    size={12}
                    onClick={() => handleDeleteInstruction(inst.id)}
                    style={{ color: theme.color.textFaint, width: 18, height: 18 }}
                  />
                </Stack>
              </Stack>
            </div>
          ))}
          {instructions.length === 0 && (
            <p style={{ margin: 0, fontSize: theme.font.size.sm, color: theme.color.textFaint, textAlign: "center" }}>
              No instructions yet. Add one above.
            </p>
          )}
        </Stack>
      </div>

      {/* Instruction detail panel */}
      {selectedInstruction && (
        <InstructionDetailPanel
          instruction={selectedInstruction}
          workbenchId={id}
          onClose={() => setSelectedInstructionId(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InstructionDetailPanel — side panel with prompt detail and bindings table
// ---------------------------------------------------------------------------

const bindingKindOptions = [
  { value: "input", label: "Input" },
  { value: "output", label: "Output" },
  { value: "context", label: "Context" },
];

function InstructionDetailPanel({
  instruction,
  workbenchId,
  onClose,
  showToast,
}: {
  instruction: Instruction;
  workbenchId: string;
  onClose: () => void;
  showToast: (message: string, type?: ToastType) => void;
}) {
  const { theme } = useTheme();
  const windowWidth = useWindowWidth();
  const isSmall = windowWidth < SMALL_BREAKPOINT;
  const [bindings, setBindings] = useState<InstructionBinding[]>([]);
  const [newArn, setNewArn] = useState("");
  const [newKind, setNewKind] = useState<BindingKind>("input");
  const [addingBinding, setAddingBinding] = useState(false);

  useEffect(() => {
    fetchBindings();
  }, [instruction.id]);

  async function fetchBindings() {
    try {
      const res = await apiFetch(
        `/api/workbenches/${encodeURIComponent(workbenchId)}/instructions/${instruction.id}/bindings`,
      );
      const body = await res.json();
      setBindings(body.data);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load bindings");
    }
  }

  async function handleAddBinding(e: React.FormEvent) {
    e.preventDefault();
    if (!newArn.trim()) return;
    setAddingBinding(true);
    try {
      await apiFetch(
        `/api/workbenches/${encodeURIComponent(workbenchId)}/instructions/${instruction.id}/bindings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ arn: newArn.trim(), kind: newKind }),
        },
      );
      setNewArn("");
      fetchBindings();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to add binding");
    } finally {
      setAddingBinding(false);
    }
  }

  async function handleRemoveBinding(bindingId: string) {
    try {
      await apiFetch(
        `/api/workbenches/${encodeURIComponent(workbenchId)}/instructions/${instruction.id}/bindings/${bindingId}`,
        { method: "DELETE" },
      );
      fetchBindings();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to remove binding");
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const kindColor: Record<BindingKind, string> = {
    input: theme.color.primary,
    output: theme.color.success,
    context: theme.color.tertiary,
  };

  const panel = (
    <div
      style={{
        ...(isSmall
          ? { position: "fixed" as const, inset: 0, zIndex: 101 }
          : { flex: "1 0 400px", maxWidth: 640, alignSelf: "stretch" }),
        borderLeft: isSmall ? undefined : `1px solid ${theme.color.borderSubtle}`,
        background: isSmall ? theme.color.surface : theme.color.surfaceContainerLow,
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: `${theme.spacing.xl} ${theme.spacing.xl} ${theme.spacing.lg}`, borderBottom: `1px solid ${theme.color.borderSubtle}` }}>
        <Stack direction="row" justify="space-between" align="flex-start" gap="sm">
          <div style={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" align="center" gap="xs" style={{ marginBottom: theme.spacing.sm }}>
              <span style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted, fontWeight: 500 }}>
                Position {instruction.position}
              </span>
            </Stack>
            <h2
              style={{
                margin: 0,
                fontFamily: theme.font.headline,
                fontSize: theme.font.size.xl,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: theme.color.text,
                lineHeight: 1.3,
              }}
            >
              Instruction
            </h2>
          </div>
          <IconButton icon="close" size={18} onClick={onClose} />
        </Stack>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: theme.spacing.xl, display: "flex", flexDirection: "column" }}>
        {/* Prompt */}
        <div style={{ marginBottom: theme.spacing.xl }}>
          <span
            style={{
              display: "block",
              fontSize: "0.625rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: theme.color.textFaint,
              marginBottom: theme.spacing.sm,
            }}
          >
            Prompt
          </span>
          <Markdown>{instruction.prompt}</Markdown>
        </div>

        {/* Output */}
        <div style={{ marginBottom: theme.spacing.xl }}>
          <span
            style={{
              display: "block",
              fontSize: "0.625rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: theme.color.textFaint,
              marginBottom: theme.spacing.sm,
            }}
          >
            Output
          </span>
          {instruction.output ? (
            <Markdown>{instruction.output}</Markdown>
          ) : (
            <p style={{ margin: 0, fontSize: theme.font.size.xs, color: theme.color.textFaint, fontStyle: "italic" }}>
              No output yet
            </p>
          )}
        </div>

        {/* Bindings table */}
        <div style={{ marginBottom: theme.spacing.xl }}>
          <span
            style={{
              display: "block",
              fontSize: "0.625rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: theme.color.textFaint,
              marginBottom: theme.spacing.sm,
            }}
          >
            Bindings
          </span>

          {bindings.length > 0 ? (
            <div
              style={{
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.color.borderSubtle}`,
                overflow: "hidden",
                marginBottom: theme.spacing.sm,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: theme.font.size.xs,
                }}
              >
                <thead>
                  <tr style={{ background: theme.color.surfaceContainerHigh }}>
                    <th style={{ textAlign: "left", padding: `${theme.spacing.xs} ${theme.spacing.sm}`, color: theme.color.textFaint, fontWeight: 600, fontSize: "0.625rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      ARN
                    </th>
                    <th style={{ textAlign: "left", padding: `${theme.spacing.xs} ${theme.spacing.sm}`, color: theme.color.textFaint, fontWeight: 600, fontSize: "0.625rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      Kind
                    </th>
                    <th style={{ width: 28, padding: `${theme.spacing.xs} ${theme.spacing.sm}` }} />
                  </tr>
                </thead>
                <tbody>
                  {bindings.map((b) => (
                    <tr
                      key={b.id}
                      style={{ borderTop: `1px solid ${theme.color.borderSubtle}` }}
                    >
                      <td
                        style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          fontFamily: "monospace",
                          color: theme.color.textMuted,
                          wordBreak: "break-all",
                        }}
                      >
                        {b.arn}
                      </td>
                      <td style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}` }}>
                        <span
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 600,
                            color: kindColor[b.kind],
                            background: theme.color.surfaceContainerHigh,
                            borderRadius: theme.radius.sm,
                            padding: "1px 5px",
                          }}
                        >
                          {b.kind}
                        </span>
                      </td>
                      <td style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}`, textAlign: "center" }}>
                        <IconButton
                          icon="close"
                          size={12}
                          onClick={() => handleRemoveBinding(b.id)}
                          style={{ color: theme.color.textFaint, width: 16, height: 16 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ margin: `0 0 ${theme.spacing.sm}`, fontSize: theme.font.size.xs, color: theme.color.textFaint, fontStyle: "italic" }}>
              No bindings
            </p>
          )}

          <form onSubmit={handleAddBinding} style={{ display: "flex", gap: theme.spacing.xs, alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input
                placeholder="tab:project:01ABC..."
                value={newArn}
                onChange={(e) => setNewArn(e.target.value)}
                style={{ fontSize: theme.font.size.xs, padding: "2px 6px" }}
              />
            </div>
            <Select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as BindingKind)}
              options={bindingKindOptions}
              style={{ fontSize: "0.625rem", padding: "0.1rem 0.25rem" }}
            />
            <Button type="submit" size="sm" disabled={addingBinding} style={{ fontSize: theme.font.size.xs, padding: "2px 8px" }}>
              {addingBinding ? "…" : "Bind"}
            </Button>
          </form>
        </div>

        {/* Metadata */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: theme.spacing.xl,
            borderTop: `1px solid ${theme.color.borderSubtle}`,
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: "0.625rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: theme.color.textFaint,
              marginBottom: theme.spacing.sm,
            }}
          >
            Metadata
          </span>
          <Stack gap="xs">
            {[
              { label: "ID", value: instruction.id },
              { label: "Position", value: `${instruction.position}` },
              { label: "Created", value: formatDate(instruction.created_at) },
              { label: "Updated", value: formatDate(instruction.updated_at) },
            ].map((row) => (
              <Stack key={row.label} direction="row" justify="space-between" align="center">
                <span style={{ fontSize: theme.font.size.xs, color: theme.color.textFaint }}>{row.label}</span>
                <span style={{ fontSize: theme.font.size.xs, color: theme.color.textMuted, fontFamily: "monospace", textAlign: "right" }}>
                  {row.value}
                </span>
              </Stack>
            ))}
          </Stack>
        </div>
      </div>
    </div>
  );

  if (isSmall) {
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }} />
        {panel}
      </>
    );
  }

  return panel;
}
