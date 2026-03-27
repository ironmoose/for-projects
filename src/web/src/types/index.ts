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

export interface Workbench {
  id: string;
  goal: string;
  created_at: string;
  updated_at: string;
}

export interface Instruction {
  id: string;
  workbench_id: string;
  prompt: string;
  output: string | null;
  position: number;
  status: "pending" | "running" | "complete" | "skipped";
  agent: string | null;
  actor: "agent" | "human";
  parallel: boolean;
  created_at: string;
  updated_at: string;
}

export type BindingKind = "input" | "output" | "context";

export interface InstructionBinding {
  id: string;
  instruction_id: string;
  arn: string;
  kind: BindingKind;
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

export const bindingKindOptions = [
  { value: "input", label: "Input" },
  { value: "output", label: "Output" },
  { value: "context", label: "Context" },
];

export const statusLabel: Record<Task["status"], string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export function kindColor(theme: { color: { primary: string; success: string; tertiary: string } }): Record<BindingKind, string> {
  return {
    input: theme.color.primary,
    output: theme.color.success,
    context: theme.color.tertiary,
  };
}
