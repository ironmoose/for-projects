import type { Agent, Run, RunStatsResponse, Project, Session, Task } from "./types";

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

function qs(params?: Record<string, string | number | boolean | undefined>): string {
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
  await apiFetch("/api/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
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
  await apiFetch("/api/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Agents API
// ---------------------------------------------------------------------------

export async function fetchAgents(params?: { identifier?: string; enabled?: boolean; limit?: number; offset?: number }): Promise<{ data: Agent[]; total: number }> {
  const res = await apiFetch(`/api/agents${qs(params)}`);
  return res.json();
}

export async function createAgents(inputs: Array<{ identifier: string; prompt: string; agent: string; enabled: boolean }>): Promise<Agent[]> {
  const res = await apiFetch("/api/agents", jsonPost(inputs));
  return res.json();
}

export async function updateAgents(inputs: Array<{ id: string; identifier?: string; prompt?: string; agent?: string; enabled?: boolean }>): Promise<Agent[]> {
  const res = await apiFetch("/api/agents", jsonPatch(inputs));
  return res.json();
}

export async function deleteAgents(ids: string[]): Promise<void> {
  await apiFetch("/api/agents", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Sessions API
// ---------------------------------------------------------------------------

export async function fetchSessions(params?: { project_id?: string; limit?: number; offset?: number }): Promise<{ data: Session[]; total: number }> {
  const res = await apiFetch(`/api/sessions${qs(params)}`);
  return res.json();
}

export async function fetchSession(id: string): Promise<Session> {
  const res = await apiFetch(`/api/sessions/${encodeURIComponent(id)}`);
  return res.json();
}

export async function updateSessions(inputs: Array<{ id: string; summary?: string | null; finished_at?: string | null }>): Promise<Session[]> {
  const res = await apiFetch("/api/sessions", jsonPatch(inputs));
  return res.json();
}

export async function deleteSessions(ids: string[]): Promise<void> {
  await apiFetch("/api/sessions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Runs API
// ---------------------------------------------------------------------------

export async function fetchRuns(params?: { entity_type?: string; entity_id?: string; agent?: string; status?: string; search?: string; started_after?: string; started_before?: string; finished_after?: string; agent_identifier?: string; limit?: number; offset?: number }): Promise<{ data: Run[]; total: number }> {
  const res = await apiFetch(`/api/runs${qs(params)}`);
  return res.json();
}

export async function createRun(inputs: Array<{ agent: string; entity_type: string; entity_id: string; status: string; output?: string }>): Promise<Run[]> {
  const res = await apiFetch("/api/runs", jsonPost(inputs));
  return res.json();
}

export async function updateRun(inputs: Array<{ id: string; status?: string; output?: string | null; finished_at?: string | null }>): Promise<Run[]> {
  const res = await apiFetch("/api/runs", jsonPatch(inputs));
  return res.json();
}

export async function fetchRunStats(params?: { days?: number }): Promise<RunStatsResponse> {
  const res = await apiFetch(`/api/runs/stats${qs(params)}`);
  return res.json();
}
