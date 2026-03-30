import type { ActionKind, AgentType, ActionLogStatus, EntityType } from "./entities";

export interface CreateProjectInput {
  title: string;
  goal?: string;
  requirements?: string;
  design?: string;
}

export interface UpdateProjectInput {
  id: string;
  title?: string;
  goal?: string | null;
  requirements?: string | null;
  design?: string | null;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  plan?: string;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  plan?: string | null;
}

export interface CreateActionInput {
  kind: ActionKind;
  prompt: string;
  agent: AgentType;
}

export interface UpdateActionInput {
  id: string;
  kind?: ActionKind;
  prompt?: string;
  agent?: AgentType;
}

export interface CreateActionLogInput {
  action_id: string;
  entity_type: EntityType;
  entity_id: string;
}

export interface UpdateActionLogInput {
  id: string;
  status?: ActionLogStatus;
  output?: string | null;
  finished_at?: string | null;
}
