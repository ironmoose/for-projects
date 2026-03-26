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
  useTheme,
} from "./components";
import { API_BASE } from "./api";
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

export function App() {
  const { theme } = useTheme();
  const { path, navigate } = useHashRoute();

  // Match /projects/:slug
  const projectSlugMatch = path.match(/^\/projects\/([^/]+)$/);
  const projectSlug = projectSlugMatch?.[1] ?? null;

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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: theme.font.body }}>
      <TopBar trailing={<ConnectionIndicator connected={connected} />} />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
        {projectSlug ? (
          <ProjectView slug={projectSlug} onBack={() => navigate("/")} subscribeEvents={subscribeEvents} />
        ) : (
          <DashboardView onOpenProject={(slug) => navigate(`/projects/${slug}`)} subscribeEvents={subscribeEvents} />
        )}
      </main>
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

function DashboardView({ onOpenProject, subscribeEvents }: { onOpenProject: (slug: string) => void; subscribeEvents: (fn: (e: DomainEvent) => void) => () => void }) {
  const { theme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchProjectsRef = useRef<() => void>();

  async function fetchProjects() {
    const res = await fetch(`${API_BASE}/api/projects`);
    if (!res.ok) return;
    const body = await res.json();
    setProjects(body.data);
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
    const res = await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, description }),
    });
    if (!res.ok) return;
    setName("");
    setSlug("");
    setDescription("");
    setShowCreateForm(false);
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
                <Button type="submit">Create</Button>
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

function ProjectView({ slug, onBack, subscribeEvents }: { slug: string; onBack: () => void; subscribeEvents: (fn: (e: DomainEvent) => void) => () => void }) {
  const { theme } = useTheme();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;

  const slugRef = useRef(slug);
  slugRef.current = slug;

  async function fetchProject() {
    const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(slug)}`);
    if (!res.ok) { setNotFound(true); return; }
    const p: Project = await res.json();
    setProject(p);
    fetchTasks(p.slug);
  }

  async function fetchTasks(projectSlug: string) {
    const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectSlug)}/tasks`);
    if (!res.ok) return;
    const body = await res.json();
    setTasks(body.data);
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
    const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(project.slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim() || !project) return;
    const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(project.slug)}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTaskTitle }),
    });
    if (!res.ok) return;
    setNewTaskTitle("");
  }

  async function handleTaskStatusChange(taskId: string, status: Task["status"]) {
    if (!project) return;
    const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(project.slug)}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
  }

  async function handleDeleteTask(taskId: string) {
    if (!project) return;
    const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(project.slug)}/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) return;
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
          <Button type="submit" size="sm">
            <Icon name="add" size={16} />
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
                                color: task.effort === "extreme" || task.effort === "high" ? theme.color.error : task.effort === "moderate" ? theme.color.tertiary : theme.color.textFaint,
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
                                color: task.priority <= 3 ? theme.color.error : task.priority <= 6 ? theme.color.tertiary : theme.color.textFaint,
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

function TaskDetailPanel({ task, projectSlug, onClose }: { task: Task; projectSlug: string; onClose: () => void }) {
  const { theme } = useTheme();
  const windowWidth = useWindowWidth();
  const isSmall = windowWidth < SMALL_BREAKPOINT;
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    fetchTags();
  }, [task.id]);

  async function fetchTags() {
    const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectSlug)}/tasks/${task.id}/tags`);
    if (!res.ok) return;
    const body = await res.json();
    setTags(body.data);
  }

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectSlug)}/tasks/${task.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim().toLowerCase() }),
    });
    if (!res.ok) return;
    setNewTagName("");
    fetchTags();
  }

  async function handleRemoveTag(tagId: string) {
    const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectSlug)}/tasks/${task.id}/tags/${tagId}`, { method: "DELETE" });
    if (!res.ok) return;
    fetchTags();
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
                    color: task.priority <= 3 ? theme.color.error : task.priority <= 6 ? theme.color.tertiary : theme.color.textFaint,
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
              <Button type="submit" size="sm" style={{ fontSize: theme.font.size.xs, padding: "2px 8px" }}>
                Add
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
