import type { Project, Task } from "./entities";
import type { ProjectStatus, TaskStatus } from "./statuses";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "./inputs";

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface ProjectFilter {
  status?: ProjectStatus;
}

export interface TaskFilter {
  status?: TaskStatus;
}

export interface IProjectService {
  findAll(limit?: number, offset?: number, filter?: ProjectFilter): Paginated<Project>;
  findBySlug(slug: string): Project | null;
  create(input: CreateProjectInput): Project;
  update(slug: string, input: UpdateProjectInput): Project | null;
  delete(slug: string): boolean;
}

export interface ITaskService {
  findByProjectSlug(projectSlug: string, limit?: number, offset?: number, filter?: TaskFilter): Paginated<Task>;
  create(projectSlug: string, input: CreateTaskInput): Task;
  update(id: string, input: UpdateTaskInput): Task | null;
  delete(id: string): boolean;
}
