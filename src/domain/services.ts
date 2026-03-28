import type { Project, Task, Action, ActionStatus } from "./entities";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
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

export interface IActionService {
  findByTarget(target: string, limit?: number, offset?: number, status?: string): Paginated<Action>;
  findById(id: string): Action | null;
  createMany(target: string, actions: { rank: number; prompt?: string; agent?: string }[]): Action[];
  updateMany(target: string, updates: UpdateActionInput[]): Action[];
  deleteMany(target: string, ids: string[]): number;
  updateStatus(id: string, status: ActionStatus): Action | null;
  getExecutableActions(target: string): Action[];
  getActionPlan(target: string): Array<{ rank: number; actions: Action[] }>;
  getDashboardData(): { executable: Action[]; inProgress: Action[]; recentlyTerminal: Action[] };
}
