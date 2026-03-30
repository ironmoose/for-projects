import type { AgentType, EntityType, RunStatus } from "./entities";

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

export interface CreateAgentInput {
  identifier: string;
  prompt: string;
  agent: AgentType;
  enabled?: boolean;
}

export interface UpdateAgentInput {
  id: string;
  identifier?: string;
  prompt?: string;
  agent?: AgentType;
  enabled?: boolean;
}

export interface CreateRunInput {
  agent: string;
  entity_type: EntityType;
  entity_id: string;
  started_at?: string;
}

export interface UpdateRunInput {
  id: string;
  status?: RunStatus;
  output?: string | null;
  finished_at?: string | null;
}
