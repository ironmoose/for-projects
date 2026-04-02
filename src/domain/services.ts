import type { Project, ProjectSummary, Task, TaskSummary, Document, DocumentSummary } from "./entities";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateDocumentInput,
  UpdateDocumentInput,
} from "./inputs";

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface IProjectService {
  list(filter?: { id?: string; limit?: number; offset?: number }): Paginated<ProjectSummary>;
  get(id: string): Project;
  create(inputs: CreateProjectInput[]): Project[];
  update(inputs: UpdateProjectInput[]): Project[];
  remove(ids: string[]): void;
}

export interface ITaskService {
  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string; title?: string }): Paginated<TaskSummary>;
  get(id: string): Task;
  create(inputs: CreateTaskInput[]): Task[];
  update(inputs: UpdateTaskInput[]): Task[];
  remove(ids: string[]): void;
}

export interface IDocumentService {
  list(filter?: { title?: string; tag?: string; limit?: number; offset?: number }): Paginated<DocumentSummary>;
  get(id: string): Document & { tags: string[] };
  create(inputs: CreateDocumentInput[]): (Document & { tags: string[] })[];
  update(inputs: UpdateDocumentInput[]): (Document & { tags: string[] })[];
  remove(ids: string[]): void;
}
