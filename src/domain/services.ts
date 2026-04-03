import type { Project, ProjectSummary, Task, TaskSummary, Document, DocumentSummary, TaskDependency, NormalizedDependencyDetail } from "./entities";
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
  list(filter?: { id?: string; title?: string; limit?: number; offset?: number }): Paginated<ProjectSummary>;
  get(id: string): Project;
  create(inputs: CreateProjectInput[]): Project[];
  update(inputs: UpdateProjectInput[]): Project[];
  remove(ids: string[]): void;
}

export interface ITaskService {
  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string; title?: string; blocked?: boolean }): Paginated<TaskSummary>;
  get(id: string): Task;
  create(inputs: CreateTaskInput[]): Task[];
  update(inputs: UpdateTaskInput[]): Task[];
  remove(ids: string[]): void;
}

export interface ITaskDependencyService {
  addDependencies(projectId: string, deps: { source_task_id: string; target_task_id: string; dependency_type: string }[]): TaskDependency[];
  removeDependencies(pairs: { source_task_id: string; target_task_id: string }[]): void;
  getDependencies(taskId: string): { blocks: NormalizedDependencyDetail[]; blocked_by: NormalizedDependencyDetail[]; relates_to: NormalizedDependencyDetail[]; is_blocked: boolean };
  getGraph(projectId: string): { edges: TaskDependency[]; blocked_task_ids: string[] };
}

export interface IDocumentService {
  list(filter?: { title?: string; tag?: string; favorite?: boolean; project_id?: string; limit?: number; offset?: number }): Paginated<DocumentSummary>;
  get(id: string): Document & { tags: string[] };
  create(inputs: CreateDocumentInput[]): (Document & { tags: string[] })[];
  update(inputs: UpdateDocumentInput[]): (Document & { tags: string[] })[];
  remove(ids: string[]): void;
}
