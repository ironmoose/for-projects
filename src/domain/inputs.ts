import type { ActionStatus, EntityType, ActionRole } from "./entities";

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
  prompt: string;
  agent?: string;
}

export interface UpdateActionInput {
  prompt?: string;
  agent?: string;
}

export interface CreateEntityActionInput {
  entity_type: EntityType;
  entity_id: string;
  role: ActionRole;
  action_id: string;
  status?: ActionStatus;
}

export interface UpdateEntityActionInput {
  status?: ActionStatus;
  output?: string | null;
}
