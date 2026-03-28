import type { ActionStatus } from "./entities";

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: string;
}

export interface CreateTaskInput {
  project_id: string;
  summary: string;
  context?: string;
  status?: string;
}

export interface UpdateTaskInput {
  summary?: string;
  context?: string;
  status?: string;
}

export interface CreateActionInput {
  target: string;
  rank: number;
  prompt: string;
  agent?: string;
  status?: ActionStatus;
}

export interface UpdateActionInput {
  id: string;
  prompt?: string;
  agent?: string;
}
