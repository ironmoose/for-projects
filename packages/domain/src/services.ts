import type { Project, Task } from "./entities";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "./inputs";

export interface IProjectService {
  findAll(): Project[];
  findBySlug(slug: string): Project | null;
  create(input: CreateProjectInput): Project;
  update(slug: string, input: UpdateProjectInput): Project | null;
  delete(slug: string): boolean;
}

export interface ITaskService {
  findByProjectSlug(projectSlug: string): Task[];
  create(projectSlug: string, input: CreateTaskInput): Task;
  update(id: string, input: UpdateTaskInput): Task | null;
  delete(id: string): boolean;
}
