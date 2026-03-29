import type { Action, EntityAction, EntityActionDashboardRow, Project, Task } from "./types";

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
// Actions API
// ---------------------------------------------------------------------------

export async function createAction(input: { prompt: string; agent?: string }): Promise<Action> {
  const res = await apiFetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function fetchAction(id: string): Promise<Action> {
  const res = await apiFetch(`/api/actions/${encodeURIComponent(id)}`);
  return res.json();
}

export async function fetchActions(params?: { status?: string; agent?: string; limit?: number; offset?: number }): Promise<{ data: Action[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.agent) searchParams.set("agent", params.agent);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  const res = await apiFetch(`/api/actions${qs ? `?${qs}` : ""}`);
  return res.json();
}

export async function updateAction(id: string, input: { prompt?: string; agent?: string }): Promise<Action> {
  const res = await apiFetch(`/api/actions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// Projects API
// ---------------------------------------------------------------------------

export async function updateProject(id: string, input: Record<string, unknown>): Promise<Project> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// Tasks API
// ---------------------------------------------------------------------------

export async function updateTask(projectId: string, id: string, input: Record<string, unknown>): Promise<Task> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// Entity Actions API
// ---------------------------------------------------------------------------

export async function linkAction(input: { entity_type: string; entity_id: string; role: string; action_id: string; status?: string }): Promise<EntityAction> {
  const res = await apiFetch("/api/entity-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function unlinkAction(entityType: string, entityId: string, role: string): Promise<void> {
  await apiFetch(`/api/entity-actions/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/${encodeURIComponent(role)}`, {
    method: "DELETE",
  });
}

export async function fetchEntityActions(entityType: string, entityId: string): Promise<EntityAction[]> {
  const res = await apiFetch(`/api/entity-actions/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`);
  return res.json();
}

export async function fetchEntityAction(entityType: string, entityId: string, role: string): Promise<EntityAction> {
  const res = await apiFetch(`/api/entity-actions/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/${encodeURIComponent(role)}`);
  return res.json();
}

export async function updateEntityActionStatus(entityType: string, entityId: string, role: string, status: string): Promise<EntityAction> {
  const res = await apiFetch(`/api/entity-actions/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/${encodeURIComponent(role)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function fetchActionsDashboard(params?: { status?: string; limit?: number; offset?: number }): Promise<{ data: EntityActionDashboardRow[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const qs = searchParams.toString();
  const res = await apiFetch(`/api/entity-actions/dashboard${qs ? `?${qs}` : ""}`);
  return res.json();
}

export async function updateEntityActionOutput(entityType: string, entityId: string, role: string, output: string): Promise<EntityAction> {
  const res = await apiFetch(`/api/entity-actions/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/${encodeURIComponent(role)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ output }),
  });
  return res.json();
}
