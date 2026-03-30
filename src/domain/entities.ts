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

export interface Agent {
  id: string;
  identifier: string;
  prompt: string;
  agent: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export type RunStatus = 'running' | 'done' | 'failed' | 'todo' | 'cancelled';

export type EntityType = 'project' | 'task';

export interface Run {
  id: string;
  agent: string;
  entity_type: EntityType;
  entity_id: string;
  status: RunStatus;
  output: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface RunStats {
  by_status: { status: RunStatus; count: number }[];
  by_agent: { agent: string; count: number }[];
  total: number;
}

export interface RunDailyStats {
  date: string;
  status: string;
  agent: string;
  count: number;
  avg_duration_ms: number | null;
}

export interface RunSummaryStats {
  total: number;
  done: number;
  failed: number;
  running: number;
  todo: number;
  cancelled: number;
  avg_duration_ms: number | null;
}
