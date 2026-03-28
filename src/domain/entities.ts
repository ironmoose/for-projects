import type { ProjectStatus, TaskStatus, TaskType, TaskEffort, WorkflowStatus } from "./enums";

export interface Project {
  id: string;
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

export interface Workflow {
  id: string;
  goal: string;
  cursor: string | null;
  status: WorkflowStatus;
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

export interface InstructionBinding {
  id: string;
  instruction_id: string;
  arn: string;
  created_at: string;
  updated_at: string;
}
