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

export type ActionKind = 'plan' | 'goal' | 'requirements' | 'design';

export type AgentType = 'tab:orchestrator' | 'tab:executor';

export interface Action {
  id: string;
  kind: ActionKind;
  prompt: string;
  agent: AgentType;
  created_at: string;
  updated_at: string;
}

export type ActionLogStatus = 'running' | 'done' | 'failed';

export type EntityType = 'project' | 'task';

export interface ActionLogEntry {
  id: string;
  action_id: string;
  entity_type: EntityType;
  entity_id: string;
  status: ActionLogStatus;
  output: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface ActionLogDailyStats {
  date: string;
  status: string;
  kind: string;
  count: number;
  avg_duration_ms: number | null;
}

export interface ActionLogSummaryStats {
  total: number;
  done: number;
  failed: number;
  running: number;
  avg_duration_ms: number | null;
}
