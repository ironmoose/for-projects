// -- Value arrays & derived union types ------------------------------------

export const TASK_STATUSES = ['todo', 'in_progress', 'done', 'archived'] as const;
export const EFFORT_LEVELS = ['trivial', 'low', 'medium', 'high', 'extreme'] as const;
export const IMPACT_LEVELS = ['trivial', 'low', 'medium', 'high', 'extreme'] as const;
export const TASK_CATEGORIES = ['feature', 'bugfix', 'refactor', 'test', 'perf', 'infra', 'docs', 'security', 'design', 'chore'] as const;
export const TAG_NAMES = [
  'ui', 'data', 'integration', 'infra', 'domain',
  'architecture', 'conventions', 'guide', 'reference', 'decision', 'troubleshooting',
  'security', 'performance', 'testing', 'accessibility',
] as const;
export const DEPENDENCY_TYPES = ['blocks', 'relates_to'] as const;
export type DependencyType = typeof DEPENDENCY_TYPES[number];

export const ENTITY_TYPES = ['project', 'task', 'document'] as const;
export const ACTIVITY_ACTIONS = ['created', 'updated', 'deleted'] as const;

export type TaskStatus = typeof TASK_STATUSES[number];
export type EffortLevel = typeof EFFORT_LEVELS[number];
export type ImpactLevel = typeof IMPACT_LEVELS[number];
export type TaskCategory = typeof TASK_CATEGORIES[number];
export type TagName = typeof TAG_NAMES[number];
export type EntityType = typeof ENTITY_TYPES[number];
export type ActivityAction = typeof ACTIVITY_ACTIONS[number];

export const TAG_CATEGORIES: Record<string, readonly TagName[]> = {
  Domain: ['ui', 'data', 'integration', 'infra', 'domain'],
  'Content Type': ['architecture', 'conventions', 'guide', 'reference', 'decision', 'troubleshooting'],
  Concern: ['security', 'performance', 'testing', 'accessibility'],
} as const;

// -- Entity interfaces ------------------------------------------------------

export interface Project {
  id: string;
  title: string;
  goal: string | null;
  requirements: string | null;
  design: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  plan: string | null;
  description: string | null;
  implementation: string | null;
  acceptance_criteria: string | null;
  group_key: string | null;
  status: TaskStatus;
  effort: EffortLevel | null;
  impact: ImpactLevel | null;
  category: TaskCategory | null;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

// -- Summary types (projections for list responses) -----------------------

export interface ProjectSummary {
  id: string;
  title: string;
  has_goal: boolean;
  has_requirements: boolean;
  has_design: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskSummary {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  effort: EffortLevel | null;
  impact: ImpactLevel | null;
  category: TaskCategory | null;
  group_key: string | null;
  is_blocked: boolean;
  has_plan: boolean;
  has_description: boolean;
  has_implementation: boolean;
  has_acceptance_criteria: boolean;
  created_at: string;
  updated_at: string;
}

// -- Summary mappers -----------------------------------------------------

export function toProjectSummary(p: Project): ProjectSummary {
  return {
    id: p.id, title: p.title,
    has_goal: p.goal != null, has_requirements: p.requirements != null, has_design: p.design != null,
    created_at: p.created_at, updated_at: p.updated_at,
  };
}

export function toTaskSummary(t: Task): TaskSummary {
  return {
    id: t.id, project_id: t.project_id, title: t.title, status: t.status,
    effort: t.effort, impact: t.impact, category: t.category, group_key: t.group_key,
    is_blocked: t.is_blocked ?? false,
    has_plan: t.plan != null, has_description: t.description != null,
    has_implementation: t.implementation != null, has_acceptance_criteria: t.acceptance_criteria != null,
    created_at: t.created_at, updated_at: t.updated_at,
  };
}

export interface Document {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  summary: string | null;
  has_content: boolean;
  favorite: boolean;
  tags: TagName[];
  created_at: string;
  updated_at: string;
}

export function toDocumentSummary(doc: Document, tags: TagName[] = []): DocumentSummary {
  return {
    id: doc.id, title: doc.title,
    summary: doc.summary,
    has_content: doc.content != null,
    favorite: doc.favorite,
    tags,
    created_at: doc.created_at, updated_at: doc.updated_at,
  };
}

export interface Tag {
  id: string;
  kind: TagName;
  created_at: string;
}

// -- Task dependencies ---------------------------------------------------

export interface TaskDependency {
  source_task_id: string;
  target_task_id: string;
  dependency_type: DependencyType;
  created_at: string;
}

export interface TaskDependencyDetail extends TaskDependency {
  source_task_title: string;
  target_task_title: string;
  source_task_status: TaskStatus;
  target_task_status: TaskStatus;
}

export interface NormalizedDependencyDetail {
  task_id: string;
  task_title: string;
  task_status: TaskStatus;
  dependency_type: DependencyType;
}

export function toNormalizedDependency(
  detail: TaskDependencyDetail,
  perspective: "source" | "target",
): NormalizedDependencyDetail {
  if (perspective === "target") {
    return {
      task_id: detail.target_task_id,
      task_title: detail.target_task_title,
      task_status: detail.target_task_status,
      dependency_type: detail.dependency_type,
    };
  }
  return {
    task_id: detail.source_task_id,
    task_title: detail.source_task_title,
    task_status: detail.source_task_status,
    dependency_type: detail.dependency_type,
  };
}

// -- Activity log --------------------------------------------------------

export interface ActivityLog {
  id: string;
  entity_type: EntityType;
  entity_id: string | null;
  action: ActivityAction;
  summary: string;
  created_at: string;
}