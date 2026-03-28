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

export interface CreateTemplateInput {
  name: string;
  description?: string;
  prompt: string;
  agent?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  prompt?: string;
  agent?: string;
}

export interface CreateActionInput {
  target: string;
  rank: number;
  prompt: string;
  agent?: string;
  template_id?: string;
}

export interface UpdateActionInput {
  id: string;
  prompt?: string;
  agent?: string;
}
