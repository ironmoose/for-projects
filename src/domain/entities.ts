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

export interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface Action {
  id: string;
  target: string;
  rank: number;
  template_id: string | null;
  prompt: string;
  agent: string | null;
  created_at: string;
  updated_at: string;
}
