import type { Project, Task } from "./entities";
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

export interface IProjectService {
  list(filter?: { id?: string; limit?: number; offset?: number }): Paginated<Project>;
  get(id: string): Project;
  create(inputs: CreateProjectInput[]): Project[];
  update(inputs: UpdateProjectInput[]): Project[];
  remove(ids: string[]): void;
}

export interface ITaskService {
  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string }): Paginated<Task>;
  get(id: string): Task;
  create(inputs: CreateTaskInput[]): Task[];
  update(inputs: UpdateTaskInput[]): Task[];
  remove(ids: string[]): void;
}
