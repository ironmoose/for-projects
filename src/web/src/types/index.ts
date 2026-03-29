// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "completed" | "archived";
  created_at: string;
  updated_at: string;
  goal_action_id: string | null;
  design_action_id: string | null;
  requirements_action_id: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  summary: string;
  context: string;
  status: "todo" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
  implementation_action_id: string | null;
  validation_action_id: string | null;
}

export type ActionStatus = "todo" | "in_progress" | "complete" | "failed";

export interface Action {
  id: string;
  prompt: string;
  agent: string | null;
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
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
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
