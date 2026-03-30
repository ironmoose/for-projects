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

export type AgentType = 'tab:orchestrator' | 'tab:executor';

export type EntityType = 'project' | 'task';

export type RunStatus = 'todo' | 'running' | 'done' | 'failed' | 'cancelled';

export interface Agent {
  id: string;
  identifier: string;
  prompt: string;
  agent: AgentType;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  project_id: string;
  summary: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface Run {
  id: string;
  agent: string;
  entity_type: EntityType;
  entity_id: string;
  session_id: string | null;
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
  todo: number;
  done: number;
  failed: number;
  running: number;
  cancelled: number;
  avg_duration_ms: number | null;
}
