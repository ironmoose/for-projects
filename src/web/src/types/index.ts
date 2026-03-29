// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  summary: string;
  context: string;
  status: "todo" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
}

export type ActionStatus = "todo" | "in_progress" | "complete" | "failed";

export interface Action {
  id: string;
  name: string;
  prompt: string;
  agent: string | null;
  created_at: string;
  updated_at: string;
}

export type EntityType = "project" | "task";
export type ActionRole = "goal" | "design" | "requirements" | "implementation" | "validation";

export interface EntityAction {
  entity_type: EntityType;
  entity_id: string;
  role: ActionRole;
  action_id: string;
  status: ActionStatus;
  output: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Option arrays
// ---------------------------------------------------------------------------

export const statusOptions = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export const taskStatusOptions = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export const statusLabel: Record<Task["status"], string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export const actionStatusOptions: { value: ActionStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
  { value: "failed", label: "Failed" },
];

export const actionStatusLabel: Record<ActionStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  complete: "Complete",
  failed: "Failed",
};

export const actionValidTransitions: Record<ActionStatus, ActionStatus[]> = {
  todo: ["in_progress"],
  in_progress: ["complete", "failed"],
  complete: [],
  failed: ["todo"],
};

export interface EntityActionDashboardRow {
  entity_type: string;
  entity_id: string;
  role: string;
  action_id: string;
  status: string;
  output: string | null;
  created_at: string;
  updated_at: string;
  entity_name: string;
  action_prompt: string;
  action_agent: string;
  project_id: string | null;
}
