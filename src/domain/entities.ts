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
  group_key: string | null;
  status: string;
  effort: string | null;
  impact: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  platform_agent: string | null;
  prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  agent_id: string;
  status: string;
  input: string | null;
  output: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

// -- Summary types (projections for list responses) -----------------------

export interface ProjectSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface TaskSummary {
  id: string;
  project_id: string;
  title: string;
  status: string;
  effort: string | null;
  impact: string | null;
  category: string | null;
  group_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  platform_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobSummary {
  id: string;
  agent_id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

// -- Summary mappers -----------------------------------------------------

export function toProjectSummary(p: Project): ProjectSummary {
  return { id: p.id, title: p.title, created_at: p.created_at, updated_at: p.updated_at };
}

export function toTaskSummary(t: Task): TaskSummary {
  return { id: t.id, project_id: t.project_id, title: t.title, status: t.status, effort: t.effort, impact: t.impact, category: t.category, group_key: t.group_key, created_at: t.created_at, updated_at: t.updated_at };
}

export function toAgentSummary(a: Agent): AgentSummary {
  return { id: a.id, name: a.name, platform_agent: a.platform_agent, created_at: a.created_at, updated_at: a.updated_at };
}

export function toJobSummary(j: Job): JobSummary {
  return { id: j.id, agent_id: j.agent_id, status: j.status, started_at: j.started_at, ended_at: j.ended_at, created_at: j.created_at, updated_at: j.updated_at };
}

// -- Activity log --------------------------------------------------------

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  summary: string;
  created_at: string;
}