import type { ProjectStatus, TaskStatus, TaskType, TaskEffort, BindingKind } from "./statuses";

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  number: number;
  title: string;
  description: string;
  status: TaskStatus;
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
  created_at: string;
  updated_at: string;
}

export interface InstructionBinding {
  id: string;
  instruction_id: string;
  arn: string;
  kind: BindingKind;
  created_at: string;
  updated_at: string;
}

