import type { Project, Task, Agent, Job, ActivityLog } from "./types";

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

export async function createTasks(inputs: Array<{ project_id: string; title: string; plan?: string; description?: string; implementation?: string; acceptance_criteria?: string }>): Promise<Task[]> {
  const res = await apiFetch("/api/tasks", jsonPost(inputs));
  return res.json();
}

export async function updateTasks(inputs: Array<{ id: string; title?: string; plan?: string | null; description?: string | null; implementation?: string | null; acceptance_criteria?: string | null }>): Promise<Task[]> {
  const res = await apiFetch("/api/tasks", jsonPatch(inputs));
  return res.json();
}

export async function deleteTasks(ids: string[]): Promise<void> {
  await apiFetch("/api/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Agents API
// ---------------------------------------------------------------------------

export async function fetchAgents(params?: { limit?: number; offset?: number }): Promise<{ data: Agent[]; total: number }> {
  const res = await apiFetch(`/api/agents${qs(params)}`);
  return res.json();
}

export async function fetchAgent(id: string): Promise<Agent> {
  const res = await apiFetch(`/api/agents/${encodeURIComponent(id)}`);
  return res.json();
}

export async function createAgents(inputs: Array<{ name: string; description?: string; platform_agent?: string; prompt?: string }>): Promise<Agent[]> {
  const res = await apiFetch("/api/agents", jsonPost(inputs));
  return res.json();
}

export async function updateAgents(inputs: Array<{ id: string; name?: string; description?: string | null; platform_agent?: string | null; prompt?: string | null }>): Promise<Agent[]> {
  const res = await apiFetch("/api/agents", jsonPatch(inputs));
  return res.json();
}

export async function deleteAgents(ids: string[]): Promise<void> {
  await apiFetch("/api/agents", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Jobs API
// ---------------------------------------------------------------------------

export async function fetchJobs(params?: { agent_id?: string; status?: string; limit?: number; offset?: number }): Promise<{ data: Job[]; total: number }> {
  const res = await apiFetch(`/api/jobs${qs(params)}`);
  return res.json();
}

export async function fetchJob(id: string): Promise<Job> {
  const res = await apiFetch(`/api/jobs/${encodeURIComponent(id)}`);
  return res.json();
}

export async function createJobs(inputs: Array<{ agent_id: string; status?: string; input?: string }>): Promise<Job[]> {
  const res = await apiFetch("/api/jobs", jsonPost(inputs));
  return res.json();
}

export async function updateJobs(inputs: Array<{ id: string; status?: string; input?: string | null; output?: string | null; started_at?: string | null; ended_at?: string | null }>): Promise<Job[]> {
  const res = await apiFetch("/api/jobs", jsonPatch(inputs));
  return res.json();
}

export async function deleteJobs(ids: string[]): Promise<void> {
  await apiFetch("/api/jobs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Activity Log API
// ---------------------------------------------------------------------------

export async function fetchActivityLog(params?: { entity_type?: string; entity_id?: string; limit?: number; offset?: number }): Promise<{ data: ActivityLog[]; total: number }> {
  const res = await apiFetch(`/api/activity-log${qs(params)}`);
  return res.json();
}

