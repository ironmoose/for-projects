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
  target: string;
  /** Tier number for ordered execution. Lower ranks execute first. All actions at a rank must reach terminal status before the next rank becomes executable. */
  rank: number;
  prompt: string;
  agent: string | null;
  status: ActionStatus;
  created_at: string;
  updated_at: string;
}
