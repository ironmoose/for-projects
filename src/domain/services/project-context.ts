/**
 * ProjectContextService — assembles a token-budgeted, tiered project snapshot
 * for agent context injection. One MCP call replaces 5-8 sequential queries.
 *
 * Tiered structure:
 *   Tier 1 (always): project summary, health snapshot, active blockers
 *   Tier 2 (if budget): in-progress tasks, recent decisions, dependency risk
 *   Tier 3 (if budget): todo tasks, recent activity, key documents
 *   Tier 4 (if budget): recently completed tasks, full doc summaries, graph edges
 */
import type { TaskSummary, TaskDependency, ActivityLog, DocumentSummary } from "../entities";
import type {
  IProjectService,
  ITaskService,
  ITaskDependencyService,
  IDocumentService,
  IActivityLogService,
  IProjectContextService,
  ProjectContextResult,
} from "../services";
import { ServiceError } from "../errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContextFocus = "full" | "blockers" | "active_work";

export interface ProjectContextOptions {
  project_id: string;
  max_tokens?: number;
  focus?: ContextFocus;
  since?: string;
}

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

const CHARS_PER_TOKEN = 3.5;

/** Rough token estimate — precision isn't the goal, preventing oversized responses is. */
function estimateTokens(obj: unknown): number {
  return Math.ceil(JSON.stringify(obj).length / CHARS_PER_TOKEN);
}

// ---------------------------------------------------------------------------
// Tier builders
// ---------------------------------------------------------------------------

interface HealthSnapshot {
  total_tasks: number;
  by_status: Record<string, number>;
  blocked_count: number;
  stale_count: number;
}

interface TaskBrief {
  id: string;
  title: string;
  status: string;
  effort: string | null;
  impact: string | null;
  category: string | null;
  group_key: string | null;
  is_blocked: boolean;
}

interface DocumentBrief {
  id: string;
  title: string;
  summary: string | null;
  folder: string | null;
  tags: string[];
  favorite: boolean;
}

interface ActivityBrief {
  entity_type: string;
  entity_id: string | null;
  action: string;
  summary: string;
  created_at: string;
}

interface DeltaSection {
  tasks_created: TaskBrief[];
  tasks_completed: TaskBrief[];
  tasks_updated: TaskBrief[];
  documents_created: DocumentBrief[];
  documents_updated: DocumentBrief[];
}

function toTaskBrief(t: TaskSummary): TaskBrief {
  return {
    id: t.id, title: t.title, status: t.status,
    effort: t.effort, impact: t.impact, category: t.category,
    group_key: t.group_key, is_blocked: t.is_blocked,
  };
}

function toDocumentBrief(d: DocumentSummary): DocumentBrief {
  return {
    id: d.id, title: d.title, summary: d.summary,
    folder: d.folder, tags: d.tags, favorite: d.favorite,
  };
}

function toActivityBrief(a: ActivityLog): ActivityBrief {
  return {
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    action: a.action,
    summary: a.summary,
    created_at: a.created_at,
  };
}

const STALE_DAYS = 7;

function isStale(updatedAt: string): boolean {
  const ms = Date.now() - new Date(updatedAt).getTime();
  return ms > STALE_DAYS * 24 * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ProjectContextService implements IProjectContextService {
  constructor(
    private projectService: IProjectService,
    private taskService: ITaskService,
    private taskDependencyService: ITaskDependencyService,
    private documentService: IDocumentService,
    private activityLogService: IActivityLogService,
  ) {}

  async getProjectContext(options: ProjectContextOptions): Promise<ProjectContextResult> {
    const { project_id, max_tokens = 4000, focus = "full", since } = options;

    // Validate project exists
    const project = await this.projectService.get(project_id).catch((err) => {
      if (err instanceof ServiceError) throw err;
      throw new ServiceError("project not found", 404);
    });

    // Fetch all data in parallel
    const [
      allTasksResult,
      graphResult,
      documentsResult,
      activityResult,
      favDocumentsResult,
    ] = await Promise.all([
      this.taskService.list({ project_id, limit: 200 }),
      this.taskDependencyService.getGraph(project_id),
      this.documentService.list({ entity_type: "project", entity_id: project_id, limit: 50 }),
      this.activityLogService.list({ entity_type: "project", entity_id: project_id, limit: 50 }),
      this.documentService.list({ favorite: true, limit: 20 }),
    ]);

    // Also get task-scoped activity for richer context
    const taskActivityResult = await this.activityLogService.list({
      entity_type: "task",
      limit: 50,
    });

    const allTasks = allTasksResult.data;
    const { edges } = graphResult;

    // Compute health snapshot
    const byStatus: Record<string, number> = {};
    let blockedCount = 0;
    let staleCount = 0;
    for (const t of allTasks) {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      if (t.is_blocked) blockedCount++;
      if (t.status !== "done" && t.status !== "archived" && isStale(t.updated_at)) staleCount++;
    }

    const health: HealthSnapshot = {
      total_tasks: allTasks.length,
      by_status: byStatus,
      blocked_count: blockedCount,
      stale_count: staleCount,
    };

    // Categorize tasks
    const inProgress = allTasks.filter((t) => t.status === "in_progress").map(toTaskBrief);
    const blocked = allTasks.filter((t) => t.is_blocked).map(toTaskBrief);
    const todo = allTasks.filter((t) => t.status === "todo" && !t.is_blocked).map(toTaskBrief);
    const recentlyDone = allTasks
      .filter((t) => t.status === "done")
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0, 10)
      .map(toTaskBrief);

    // Sort todo by impact desc, effort asc for prioritization
    const impactOrder: Record<string, number> = { extreme: 5, high: 4, medium: 3, low: 2, trivial: 1 };
    const effortOrder: Record<string, number> = { trivial: 1, low: 2, medium: 3, high: 4, extreme: 5 };
    todo.sort((a, b) => {
      const impactDiff = (impactOrder[b.impact ?? ""] ?? 0) - (impactOrder[a.impact ?? ""] ?? 0);
      if (impactDiff !== 0) return impactDiff;
      return (effortOrder[a.effort ?? ""] ?? 0) - (effortOrder[b.effort ?? ""] ?? 0);
    });

    // Documents
    const linkedDocs = documentsResult.data.map(toDocumentBrief);
    const favDocs = favDocumentsResult.data.map(toDocumentBrief);

    // Recent activity (merge project + task activity, sort by time, take most recent)
    const allActivity = [
      ...activityResult.data,
      ...taskActivityResult.data.filter((a) => {
        // Only include task activity for tasks in this project
        return allTasks.some((t) => t.id === a.entity_id);
      }),
    ]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 20)
      .map(toActivityBrief);

    // Build delta section if `since` provided
    let delta: DeltaSection | undefined;
    if (since) {
      const sinceDate = new Date(since);
      const sinceMs = sinceDate.getTime();

      const tasksCreatedSince = allTasks
        .filter((t) => new Date(t.created_at).getTime() > sinceMs)
        .map(toTaskBrief);
      const tasksCompletedSince = allTasks
        .filter((t) => t.status === "done" && new Date(t.updated_at).getTime() > sinceMs)
        .map(toTaskBrief);
      const tasksUpdatedSince = allTasks
        .filter(
          (t) =>
            new Date(t.updated_at).getTime() > sinceMs &&
            new Date(t.created_at).getTime() <= sinceMs &&
            t.status !== "done",
        )
        .map(toTaskBrief);

      const docsCreatedSince = documentsResult.data
        .filter((d) => new Date(d.created_at).getTime() > sinceMs)
        .map(toDocumentBrief);
      const docsUpdatedSince = documentsResult.data
        .filter(
          (d) =>
            new Date(d.updated_at).getTime() > sinceMs &&
            new Date(d.created_at).getTime() <= sinceMs,
        )
        .map(toDocumentBrief);

      delta = {
        tasks_created: tasksCreatedSince,
        tasks_completed: tasksCompletedSince,
        tasks_updated: tasksUpdatedSince,
        documents_created: docsCreatedSince,
        documents_updated: docsUpdatedSince,
      };
    }

    // Graph edges as simple tuples
    const graphEdges = edges.map((e: TaskDependency) => ({
      source: e.source_task_id,
      target: e.target_task_id,
      type: e.dependency_type,
    }));

    // -----------------------------------------------------------------------
    // Assemble tiers based on focus
    // -----------------------------------------------------------------------

    // Tier 1: always included
    const tier1: Record<string, unknown> = {
      project: {
        id: project.id,
        title: project.title,
        summary: project.summary,
      },
      health,
    };

    // If delta is present, it goes in tier 1 (highest priority for returning agents)
    if (delta) {
      tier1.changes_since = delta;
    }

    // Blockers are always tier 1 when focus is "blockers" or there are blocked tasks
    if (blocked.length > 0) {
      tier1.blockers = blocked;
    }

    // Tier 2: varies by focus
    let tier2Items: Record<string, unknown>;
    if (focus === "blockers") {
      tier2Items = {
        ...(inProgress.length > 0 ? { in_progress: inProgress } : {}),
        ...(graphEdges.length > 0 ? { dependency_edges: graphEdges } : {}),
      };
    } else if (focus === "active_work") {
      tier2Items = {
        in_progress: inProgress,
        ...(todo.length > 0 ? { next_up: todo.slice(0, 5) } : {}),
      };
    } else {
      // "full"
      tier2Items = {
        ...(inProgress.length > 0 ? { in_progress: inProgress } : {}),
        ...(linkedDocs.length > 0 ? { linked_documents: linkedDocs } : {}),
      };
    }

    // Tier 3
    let tier3Items: Record<string, unknown>;
    if (focus === "active_work") {
      tier3Items = {
        ...(todo.length > 5 ? { remaining_todo: todo.slice(5) } : {}),
        ...(allActivity.length > 0 ? { recent_activity: allActivity.slice(0, 10) } : {}),
      };
    } else {
      tier3Items = {
        ...(todo.length > 0 ? { todo_tasks: todo } : {}),
        ...(allActivity.length > 0 ? { recent_activity: allActivity.slice(0, 10) } : {}),
        ...(favDocs.length > 0 ? { favorite_documents: favDocs } : {}),
      };
    }

    // Tier 4
    const tier4Items: Record<string, unknown> = {
      ...(recentlyDone.length > 0 ? { recently_completed: recentlyDone } : {}),
      ...(graphEdges.length > 0 && focus !== "blockers" ? { dependency_edges: graphEdges } : {}),
    };

    // -----------------------------------------------------------------------
    // Greedy knapsack packing with token budget
    // -----------------------------------------------------------------------

    const tiers = [tier1, tier2Items, tier3Items, tier4Items];
    const result: Record<string, unknown> = {};
    let usedTokens = 0;
    let tiersIncluded = 0;

    for (const tier of tiers) {
      const tierTokens = estimateTokens(tier);

      if (tiersIncluded === 0) {
        // Tier 1 is always included
        Object.assign(result, tier);
        usedTokens += tierTokens;
        tiersIncluded = 1;
        continue;
      }

      if (usedTokens + tierTokens <= max_tokens) {
        // Whole tier fits
        Object.assign(result, tier);
        usedTokens += tierTokens;
        tiersIncluded++;
      } else {
        // Try to fit individual items from this tier
        const remaining = max_tokens - usedTokens;
        for (const [key, value] of Object.entries(tier)) {
          const itemTokens = estimateTokens({ [key]: value });
          if (usedTokens + itemTokens <= max_tokens) {
            result[key] = value;
            usedTokens += itemTokens;
          } else if (Array.isArray(value) && value.length > 0) {
            // Try to fit a truncated version of the array
            const truncated = [];
            for (const item of value) {
              const next = estimateTokens({ [key]: [...truncated, item] });
              if (usedTokens + next <= max_tokens) {
                truncated.push(item);
              } else {
                break;
              }
            }
            if (truncated.length > 0) {
              result[key] = truncated;
              usedTokens += estimateTokens({ [key]: truncated });
            }
          }
        }
        tiersIncluded++;
        // Don't break — try remaining tiers for small items too
      }
    }

    return {
      ...result,
      _meta: {
        tiers_included: tiersIncluded,
        truncated: tiersIncluded < tiers.length || usedTokens > max_tokens * 0.95,
        estimated_tokens: usedTokens,
        focus,
      },
    } as ProjectContextResult;
  }
}
