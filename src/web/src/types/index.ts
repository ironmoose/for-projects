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

export interface Task {
  id: string;
  project_id: string;
  summary: string;
  context: string;
  status: "todo" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Action {
  id: string;
  target: string;
  rank: number;
  template_id: string | null;
  prompt: string;
  agent: string | null;
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
