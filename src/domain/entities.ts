import type { ProjectStatus, TaskStatus, TaskType, TaskEffort } from "./statuses";

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  number: number;
  title: string;
  description: string;
  status: TaskStatus;
  type: TaskType | null;
  effort: TaskEffort | null;
  priority: number | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  prefix: string | null;
  created_at: string;
}
