export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  goal_action_id: string | null;
  design_action_id: string | null;
  requirements_action_id: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  summary: string;
  context: string;
  status: string;
  created_at: string;
  updated_at: string;
  implementation_action_id: string | null;
  validation_action_id: string | null;
}

export type ActionStatus = 'todo' | 'in_progress' | 'complete' | 'failed';

export interface Action {
  id: string;
  prompt: string;
  agent: string | null;
  status: ActionStatus;
  output: string | null;
  created_at: string;
  updated_at: string;
}
