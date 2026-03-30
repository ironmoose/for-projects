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
  created_at: string;
  updated_at: string;
}

export interface Action {
  id: string;
  kind: string;
  prompt: string;
  agent: string;
  created_at: string;
  updated_at: string;
}

export interface ActionLogEntry {
  id: string;
  action_id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  output: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface ActionLogStats {
  by_status: { status: string; count: number }[];
  by_kind: { kind: string; count: number }[];
  total: number;
}
