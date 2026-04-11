import type { Project, ProjectSummary, Task, TaskSummary, Document, DocumentSummary, SemanticSearchResult, DocumentReferenceSummary, DocumentReferenceDetail, DocumentReferenceType, ActivityLog, TaskStatus } from "./types";

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

export interface ProjectDetail extends Project {
  documents: DocumentReferenceDetail[];
}

export async function fetchProject(id: string): Promise<ProjectDetail> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(id)}`);
  return res.json();
}

export type DocumentsMergePatch = Record<string, { type: DocumentReferenceType }[] | null>;

export async function createProjects(inputs: Array<{ title: string; summary?: string; context?: string; requirements?: string }>): Promise<Project[]> {
  const res = await apiFetch("/api/projects", jsonPost({ items: inputs }));
  return res.json();
}

export async function updateProjects(inputs: Array<{ id: string; title?: string; summary?: string | null; context?: string | null; requirements?: string | null; documents?: DocumentsMergePatch }>): Promise<Project[]> {
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

export interface TaskDetail extends Task {
}

export async function fetchTask(id: string): Promise<TaskDetail> {
  const res = await apiFetch(`/api/tasks/${encodeURIComponent(id)}`);
  return res.json();
}

export async function createTasks(inputs: Array<{ project_id: string; title: string; summary?: string; context?: string; acceptance_criteria?: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string }>): Promise<Task[]> {
  const res = await apiFetch("/api/tasks", jsonPost({ items: inputs }));
  return res.json();
}

export async function updateTasks(inputs: Array<{ id: string; title?: string; summary?: string | null; context?: string | null; acceptance_criteria?: string | null; group_key?: string | null; status?: string; effort?: string | null; impact?: string | null; category?: string | null; is_blocked?: boolean; add_dependencies?: { task_id: string; type: string }[]; remove_dependencies?: { task_id: string }[] }>): Promise<Task[]> {
  const res = await apiFetch("/api/tasks", jsonPatch({ items: inputs }));
  return res.json();
}

export interface TaskDependencyDetail {
  task_id: string;
  task_title: string;
  task_status: TaskStatus;
  dependency_type: "blocks" | "relates_to";
}

export interface TaskDependencies {
  blocks: TaskDependencyDetail[];
  blocked_by: TaskDependencyDetail[];
  relates_to: TaskDependencyDetail[];
  is_blocked: boolean;
}

export async function fetchTaskDependencies(id: string): Promise<TaskDependencies> {
  const res = await apiFetch(`/api/tasks/${encodeURIComponent(id)}/dependencies`);
  return res.json();
}

export type DependencyDetail = TaskDependencyDetail;

export async function addDependency(
  projectId: string,
  sourceTaskId: string,
  targetTaskId: string,
  dependencyType: "blocks" | "relates_to",
): Promise<void> {
  await apiFetch(
    `/api/projects/${encodeURIComponent(projectId)}/dependencies`,
    jsonPost({ items: [{ source_task_id: sourceTaskId, target_task_id: targetTaskId, dependency_type: dependencyType }] }),
  );
}

export async function removeDependency(
  projectId: string,
  sourceTaskId: string,
  targetTaskId: string,
): Promise<void> {
  await apiFetch(
    `/api/projects/${encodeURIComponent(projectId)}/dependencies`,
    { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ source_task_id: sourceTaskId, target_task_id: targetTaskId }] }) },
  );
}

export async function removeDependencyBothDirections(
  projectId: string,
  taskIdA: string,
  taskIdB: string,
): Promise<void> {
  await apiFetch(
    `/api/projects/${encodeURIComponent(projectId)}/dependencies`,
    { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ source_task_id: taskIdA, target_task_id: taskIdB }, { source_task_id: taskIdB, target_task_id: taskIdA }] }) },
  );
}

export async function fetchTaskStatusCounts(projectIds: string[]): Promise<Record<string, { total: number; counts: Record<string, number> }>> {
  const res = await apiFetch(`/api/tasks/status-counts${qs({ project_ids: projectIds.join(",") })}`);
  return res.json();
}

export async function deleteTasks(ids: string[]): Promise<void> {
  await apiFetch("/api/tasks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
}

// ---------------------------------------------------------------------------
// Documents API
// ---------------------------------------------------------------------------

export async function fetchDocuments(params?: { tag?: string; title?: string; search?: string; favorite?: boolean; entity_type?: string; entity_id?: string; folder?: string; limit?: number; offset?: number }): Promise<{ data: DocumentSummary[]; total: number }> {
  const res = await apiFetch(`/api/documents${qs(params)}`);
  return res.json();
}

export interface ReferencedByEntry {
  entity_type: string;
  entity_id: string;
  entity_title: string;
  type: string;
}

export async function fetchDocument(id: string): Promise<Document & { tags: string[]; referenced_by: ReferencedByEntry[] }> {
  const res = await apiFetch(`/api/documents/${encodeURIComponent(id)}`);
  return res.json();
}

export async function createDocuments(inputs: Array<{ title: string; summary?: string; content?: string; tags?: string[]; folder?: string | null }>): Promise<(Document & { tags: string[] })[]> {
  const res = await apiFetch("/api/documents", jsonPost({ items: inputs }));
  return res.json();
}

export async function updateDocuments(inputs: Array<{ id: string; title?: string; summary?: string | null; content?: string | null; tags?: string[]; folder?: string | null }>): Promise<(Document & { tags: string[] })[]> {
  const res = await apiFetch("/api/documents", jsonPatch({ items: inputs }));
  return res.json();
}

export async function deleteDocuments(ids: string[]): Promise<void> {
  await apiFetch("/api/documents", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
}

export async function searchDocuments(params: { q: string; tag?: string; folder?: string; favorite?: boolean; limit?: number }): Promise<SemanticSearchResult[]> {
  const res = await apiFetch(`/api/documents/search${qs(params)}`);
  return res.json();
}

export async function importDocument(input: { url: string; folder?: string; tags?: string[]; favorite?: boolean }): Promise<Document & { tags: string[] }> {
  const res = await apiFetch("/api/documents/import", jsonPost(input));
  return res.json();
}

export async function refreshDocument(id: string): Promise<Document & { tags: string[] }> {
  const res = await apiFetch(`/api/documents/${encodeURIComponent(id)}/refresh`, { method: "POST" });
  return res.json();
}

export interface GitHubTreeEntry {
  path: string;
  size: number;
  url: string;
}

export async function browseGitHubRepo(repo: string, query?: string): Promise<{ entries: GitHubTreeEntry[]; total: number }> {
  const res = await apiFetch(`/api/sources/github/tree${qs({ repo, q: query })}`);
  return res.json();
}

export async function importDocumentBatch(inputs: { url: string; folder?: string; tags?: string[]; favorite?: boolean }[]): Promise<(Document & { tags: string[] })[]> {
  const res = await apiFetch("/api/documents/import", jsonPost({ items: inputs }));
  return res.json();
}

// ---------------------------------------------------------------------------
// Health API
// ---------------------------------------------------------------------------

export interface HealthStatus {
  status: string;
  version: string;
  backend: "sqlite" | "postgres";
  uptime_seconds: number;
  database: string;
  ollama?: string;
  timestamp: string;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await apiFetch("/api/health");
  return res.json();
}

// ---------------------------------------------------------------------------
// Dependency Graph API
// ---------------------------------------------------------------------------

export interface DependencyEdge {
  source_task_id: string;
  target_task_id: string;
  dependency_type: "blocks" | "relates_to";
}

export interface GraphNode {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface DependencyGraphResponse {
  tasks: GraphNode[];
  edges: DependencyEdge[];
  blocked_task_ids: string[];
}

export async function fetchDependencyGraph(projectId: string, status?: string): Promise<DependencyGraphResponse> {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/dependency-graph${qs({ status })}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Activity Log API
// ---------------------------------------------------------------------------

export async function fetchActivityLog(params?: { entity_type?: string; entity_id?: string; limit?: number; offset?: number }): Promise<{ data: ActivityLog[]; total: number }> {
  const res = await apiFetch(`/api/activity-log${qs(params)}`);
  return res.json();
}

