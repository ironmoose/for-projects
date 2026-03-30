import type { Action, ActionLogEntry, Project, Task } from "./types";

export const API_BASE = import.meta.env.VITE_API_URL ?? "";

// ---------------------------------------------------------------------------
// ApiError — thrown by apiFetch on non-2xx responses
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// apiFetch — drop-in replacement for fetch that throws on errors
// ---------------------------------------------------------------------------

export async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new ApiError("Network error — is the server running?", 0);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      (body as Record<string, unknown> | null)?.error ??
      `Request failed (${res.status})`;
    throw new ApiError(String(message), res.status);
  }

  return res;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function jsonPost(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function jsonPatch(body: unknown): RequestInit {
  return { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// ---------------------------------------------------------------------------
// Projects API
// ---------------------------------------------------------------------------

export async function fetchProjects(params?: { limit?: number; offset?: number }): Promise<{ data: Project[]; total: number }> {
  const res = await apiFetch(`/api/projects${qs(params)}`);
  return res.json();
}

export async function fetchProject(id: string): Promise<Project> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(id)}`);
  return res.json();
}

export async function createProjects(inputs: Array<{ title: string; goal?: string; requirements?: string; design?: string }>): Promise<Project[]> {
  const res = await apiFetch("/api/projects", jsonPost(inputs));
  return res.json();
}

export async function updateProjects(inputs: Array<{ id: string; title?: string; goal?: string | null; requirements?: string | null; design?: string | null }>): Promise<Project[]> {
  const res = await apiFetch("/api/projects", jsonPatch(inputs));
  return res.json();
}

export async function deleteProjects(ids: string[]): Promise<void> {
  await apiFetch("/api/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids) });
}

// ---------------------------------------------------------------------------
// Tasks API
// ---------------------------------------------------------------------------

export async function fetchTasks(params?: { project_id?: string; limit?: number; offset?: number }): Promise<{ data: Task[]; total: number }> {
  const res = await apiFetch(`/api/tasks${qs(params)}`);
  return res.json();
}

export async function fetchTask(id: string): Promise<Task> {
  const res = await apiFetch(`/api/tasks/${encodeURIComponent(id)}`);
  return res.json();
}

export async function createTasks(inputs: Array<{ project_id: string; title: string; plan?: string }>): Promise<Task[]> {
  const res = await apiFetch("/api/tasks", jsonPost(inputs));
  return res.json();
}

export async function updateTasks(inputs: Array<{ id: string; title?: string; plan?: string | null }>): Promise<Task[]> {
  const res = await apiFetch("/api/tasks", jsonPatch(inputs));
  return res.json();
}

export async function deleteTasks(ids: string[]): Promise<void> {
  await apiFetch("/api/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids) });
}

// ---------------------------------------------------------------------------
// Actions API
// ---------------------------------------------------------------------------

export async function fetchActions(params?: { kind?: string; limit?: number; offset?: number }): Promise<{ data: Action[]; total: number }> {
  const res = await apiFetch(`/api/actions${qs(params)}`);
  return res.json();
}

export async function createActions(inputs: Array<{ kind: string; prompt: string; agent: string }>): Promise<Action[]> {
  const res = await apiFetch("/api/actions", jsonPost(inputs));
  return res.json();
}

export async function updateActions(inputs: Array<{ id: string; kind?: string; prompt?: string; agent?: string }>): Promise<Action[]> {
  const res = await apiFetch("/api/actions", jsonPatch(inputs));
  return res.json();
}

export async function deleteActions(ids: string[]): Promise<void> {
  await apiFetch("/api/actions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids) });
}

// ---------------------------------------------------------------------------
// Action Log API
// ---------------------------------------------------------------------------

export async function fetchActionLog(params?: { entity_type?: string; entity_id?: string; action_id?: string; status?: string; limit?: number; offset?: number }): Promise<{ data: ActionLogEntry[]; total: number }> {
  const res = await apiFetch(`/api/action-log${qs(params)}`);
  return res.json();
}

export async function createActionLog(inputs: Array<{ action_id: string; entity_type: string; entity_id: string; status: string; output?: string }>): Promise<ActionLogEntry[]> {
  const res = await apiFetch("/api/action-log", jsonPost(inputs));
  return res.json();
}

export async function updateActionLog(inputs: Array<{ id: string; status?: string; output?: string | null; finished_at?: string | null }>): Promise<ActionLogEntry[]> {
  const res = await apiFetch("/api/action-log", jsonPatch(inputs));
  return res.json();
}
