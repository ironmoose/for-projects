export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  summary: string;
  context: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export type ActionStatus = 'todo' | 'in_progress' | 'complete' | 'failed';

export interface Action {
  id: string;
  prompt: string;
  agent: string | null;
  created_at: string;
  updated_at: string;
}

export type EntityType = 'project' | 'task';
export type ActionRole = 'goal' | 'design' | 'requirements' | 'implementation' | 'validation';

export interface EntityAction {
  entity_type: EntityType;
  entity_id: string;
  role: ActionRole;
  action_id: string;
  status: ActionStatus;
  output: string | null;
  created_at: string;
  updated_at: string;
}
