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

export async function fetchActionsDashboard() {
  const res = await apiFetch("/api/actions/dashboard");
  return res.json();
}

export async function fetchActionPlan(target: string) {
  const res = await apiFetch(`/api/actions/${encodeURIComponent(target)}/plan`);
  const body = await res.json();
  return body.data;
}

export async function updateActionStatus(id: string, status: string) {
  const res = await apiFetch(`/api/actions/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function fetchActionsByTarget(target: string, params?: { status?: string; limit?: number; offset?: number }) {
  const searchParams = new URLSearchParams({ target });
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  const res = await apiFetch(`/api/actions?${searchParams}`);
  return res.json();
}
