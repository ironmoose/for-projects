// -- Value arrays & derived union types ------------------------------------

export const TASK_STATUSES = ['todo', 'in_progress', 'done', 'archived'] as const;
export const EFFORT_LEVELS = ['trivial', 'low', 'medium', 'high', 'extreme'] as const;
export const IMPACT_LEVELS = ['trivial', 'low', 'medium', 'high', 'extreme'] as const;
export const TASK_CATEGORIES = ['feature', 'bugfix', 'refactor', 'test', 'perf', 'infra', 'docs', 'security', 'design', 'chore'] as const;
export const ENTITY_TYPES = ['project', 'task', 'document'] as const;
export const ACTIVITY_ACTIONS = ['created', 'updated', 'deleted'] as const;

export type TaskStatus = typeof TASK_STATUSES[number];
export type EffortLevel = typeof EFFORT_LEVELS[number];
export type ImpactLevel = typeof IMPACT_LEVELS[number];
export type TaskCategory = typeof TASK_CATEGORIES[number];
export type EntityType = typeof ENTITY_TYPES[number];
export type ActivityAction = typeof ACTIVITY_ACTIONS[number];

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
    has_plan: t.plan != null, has_description: t.description != null,
    has_implementation: t.implementation != null, has_acceptance_criteria: t.acceptance_criteria != null,
    created_at: t.created_at, updated_at: t.updated_at,
  };
}

export interface Document {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  has_content: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export function toDocumentSummary(doc: Document, tags: string[] = []): DocumentSummary {
  return {
    id: doc.id, title: doc.title,
    has_content: doc.content != null,
    tags,
    created_at: doc.created_at, updated_at: doc.updated_at,
  };
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
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