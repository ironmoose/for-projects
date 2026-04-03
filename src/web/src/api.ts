import type { Project, ProjectSummary, Task, TaskSummary, Document, DocumentSummary, ActivityLog } from "./types";

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

export async function fetchProjects(params?: { limit?: number; offset?: number }): Promise<{ data: ProjectSummary[]; total: number }> {
  const res = await apiFetch(`/api/projects${qs(params)}`);
  return res.json();
}

export async function fetchProject(id: string): Promise<Project & { documents: DocumentSummary[] }> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(id)}`);
  return res.json();
}

export async function createProjects(inputs: Array<{ title: string; goal?: string; requirements?: string; design?: string }>): Promise<Project[]> {
  const res = await apiFetch("/api/projects", jsonPost({ items: inputs }));
  return res.json();
}

export async function updateProjects(inputs: Array<{ id: string; title?: string; goal?: string | null; requirements?: string | null; design?: string | null; attach_documents?: string[]; detach_documents?: string[] }>): Promise<Project[]> {
  const res = await apiFetch("/api/projects", jsonPatch({ items: inputs }));
  return res.json();
}

export async function deleteProjects(ids: string[]): Promise<void> {
  await apiFetch("/api/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Tasks API
// ---------------------------------------------------------------------------

export async function fetchTasks(params?: { project_id?: string; status?: string; effort?: string; impact?: string; category?: string; group_key?: string; title?: string; limit?: number; offset?: number }): Promise<{ data: TaskSummary[]; total: number }> {
  const res = await apiFetch(`/api/tasks${qs(params)}`);
  return res.json();
}

export async function fetchTask(id: string): Promise<Task> {
  const res = await apiFetch(`/api/tasks/${encodeURIComponent(id)}`);
  return res.json();
}

export async function createTasks(inputs: Array<{ project_id: string; title: string; plan?: string; description?: string; implementation?: string; acceptance_criteria?: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string }>): Promise<Task[]> {
  const res = await apiFetch("/api/tasks", jsonPost({ items: inputs }));
  return res.json();
}

export async function updateTasks(inputs: Array<{ id: string; title?: string; status?: string; effort?: string | null; impact?: string | null; category?: string | null; group_key?: string | null; plan?: string | null; description?: string | null; implementation?: string | null; acceptance_criteria?: string | null }>): Promise<Task[]> {
  const res = await apiFetch("/api/tasks", jsonPatch({ items: inputs }));
  return res.json();
}

export async function deleteTasks(ids: string[]): Promise<void> {
  await apiFetch("/api/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Documents API
// ---------------------------------------------------------------------------

export async function fetchDocuments(params?: { tag?: string; title?: string; favorite?: boolean; limit?: number; offset?: number }): Promise<{ data: DocumentSummary[]; total: number }> {
  const res = await apiFetch(`/api/documents${qs(params)}`);
  return res.json();
}

export async function fetchDocument(id: string): Promise<Document & { tags: string[] }> {
  const res = await apiFetch(`/api/documents/${encodeURIComponent(id)}`);
  return res.json();
}

export async function createDocuments(inputs: Array<{ title: string; content?: string; tags?: string[]; favorite?: boolean }>): Promise<(Document & { tags: string[] })[]> {
  const res = await apiFetch("/api/documents", jsonPost({ items: inputs }));
  return res.json();
}

export async function updateDocuments(inputs: Array<{ id: string; title?: string; content?: string | null; tags?: string[]; favorite?: boolean }>): Promise<(Document & { tags: string[] })[]> {
  const res = await apiFetch("/api/documents", jsonPatch({ items: inputs }));
  return res.json();
}

export async function deleteDocuments(ids: string[]): Promise<void> {
  await apiFetch("/api/documents", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Activity Log API
// ---------------------------------------------------------------------------

export async function fetchActivityLog(params?: { entity_type?: string; entity_id?: string; limit?: number; offset?: number }): Promise<{ data: ActivityLog[]; total: number }> {
  const res = await apiFetch(`/api/activity-log${qs(params)}`);
  return res.json();
}

