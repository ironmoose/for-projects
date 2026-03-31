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

export interface CreateAgentInput {
  name: string;
  description?: string;
  platform_agent?: string;
  prompt?: string;
}

export interface UpdateAgentInput {
  id: string;
  name?: string;
  description?: string | null;
  platform_agent?: string | null;
  prompt?: string | null;
}

export interface CreateJobInput {
  agent_id: string;
  status?: string;
  input?: string;
}

export interface UpdateJobInput {
  id: string;
  status?: string;
  input?: string | null;
  output?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  plan?: string;
  description?: string;
  implementation?: string;
  acceptance_criteria?: string;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  plan?: string | null;
  description?: string | null;
  implementation?: string | null;
  acceptance_criteria?: string | null;
}
