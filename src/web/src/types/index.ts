// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  title: string;
  goal: string | null;
  requirements: string | null;
  design: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  plan: string | null;
  description: string | null;
  implementation: string | null;
  acceptance_criteria: string | null;
  created_at: string;
  updated_at: string;
}

