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
}

export type TaskType = "research" | "implementation" | "review" | "design" | "planning" | "testing" | "documentation";
export type TaskEffort = "trivial" | "low" | "moderate" | "high" | "extreme";

export interface Task {
  id: string;
  project_id: string;
  number: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  type: TaskType | null;
  effort: TaskEffort | null;
  priority: number | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  prefix: string | null;
  created_at: string;
}

export interface Workflow {
  id: string;
  goal: string;
  cursor: string | null;
  status: "idle" | "running" | "paused" | "complete";
  created_at: string;
  updated_at: string;
}

export interface Phase {
  id: string;
  workflow_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Instruction {
  id: string;
  phase_id: string;
  prompt: string;
  output: string | null;
  agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Binding {
  id: string;
  instruction_id: string;
  arn: string;
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
