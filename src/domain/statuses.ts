export const PROJECT_STATUSES = ["active", "paused", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_TYPES = ["research", "implementation", "review", "design", "planning", "testing", "documentation"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_EFFORTS = ["trivial", "low", "moderate", "high", "extreme"] as const;
export type TaskEffort = (typeof TASK_EFFORTS)[number];

export const BINDING_KINDS = ["input", "output", "context"] as const;
export type BindingKind = (typeof BINDING_KINDS)[number];
