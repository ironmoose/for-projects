import type { Project, Task, Template, Action } from "./entities";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateTemplateInput,
  UpdateTemplateInput,
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

export interface ITemplateService {
  findAll(limit?: number, offset?: number): Paginated<Template>;
  findById(id: string): Template | null;
  create(input: CreateTemplateInput): Template;
  update(id: string, input: UpdateTemplateInput): Template | null;
  delete(id: string): boolean;
}

export interface IActionService {
  findByTarget(target: string, limit?: number, offset?: number): Paginated<Action>;
  findById(id: string): Action | null;
  createMany(target: string, actions: { rank: number; prompt?: string; agent?: string; template_id?: string }[]): Action[];
  updateMany(target: string, updates: UpdateActionInput[]): Action[];
  deleteMany(target: string, ids: string[]): number;
}
