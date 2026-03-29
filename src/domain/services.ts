import type { Project, Task, Action, ActionStatus } from "./entities";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateActionInput,
  UpdateActionInput,
} from "./inputs";

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface ProjectFilter {
  status?: string;
}

export interface TaskFilter {
  status?: string;
}

export interface IProjectService {
  findAll(limit?: number, offset?: number, filter?: ProjectFilter): Paginated<Project>;
  findById(id: string): Project | null;
  create(input: CreateProjectInput): Project;
  update(id: string, input: UpdateProjectInput): Project | null;
}

export interface ITaskService {
  findById(id: string): Task | null;
  findByProjectId(projectId: string, limit?: number, offset?: number, filter?: TaskFilter): Paginated<Task>;
  create(input: CreateTaskInput): Task;
  update(id: string, input: UpdateTaskInput): Task | null;
}

export interface ActionFilter {
  status?: string;
  agent?: string;
}

export interface IActionService {
  findAll(limit?: number, offset?: number, filter?: ActionFilter): Paginated<Action>;
  findById(id: string): Action | null;
  create(input: CreateActionInput): Action;
  update(id: string, input: UpdateActionInput): Action | null;
  updateStatus(id: string, status: ActionStatus): Action | null;
}
