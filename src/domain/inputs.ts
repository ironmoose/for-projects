import type { TaskStatus, EffortLevel, ImpactLevel, TaskCategory } from './entities';

export interface CreateProjectInput {
  title: string;
  goal?: string;
  requirements?: string;
  design?: string;
}

export interface UpdateProjectInput {
  id: string;
  title?: string;
  goal?: string | null;
  requirements?: string | null;
  design?: string | null;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  plan?: string;
  description?: string;
  implementation?: string;
  acceptance_criteria?: string;
  group_key?: string;
  status?: TaskStatus;
  effort?: EffortLevel;
  impact?: ImpactLevel;
  category?: TaskCategory;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  plan?: string | null;
  description?: string | null;
  implementation?: string | null;
  acceptance_criteria?: string | null;
  group_key?: string | null;
  status?: TaskStatus;
  effort?: EffortLevel | null;
  impact?: ImpactLevel | null;
  category?: TaskCategory | null;
}
