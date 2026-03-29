import type { ActionStatus } from "./entities";

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: string;
  goal_action_id?: string | null;
  design_action_id?: string | null;
  requirements_action_id?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: string;
  goal_action_id?: string | null;
  design_action_id?: string | null;
  requirements_action_id?: string | null;
}

export interface CreateTaskInput {
  project_id: string;
  summary: string;
  context?: string;
  status?: string;
  implementation_action_id?: string | null;
  validation_action_id?: string | null;
}

export interface UpdateTaskInput {
  summary?: string;
  context?: string;
  status?: string;
  implementation_action_id?: string | null;
  validation_action_id?: string | null;
}

export interface CreateActionInput {
  prompt: string;
  agent?: string;
  status?: ActionStatus;
}

export interface UpdateActionInput {
  prompt?: string;
  agent?: string;
  output?: string | null;
}
