import type { Project, ProjectSummary, Task, TaskSummary, GraphTaskSummary, Document, DocumentSummary, TaskDependency, NormalizedDependencyDetail, EntityType } from "./entities";
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

// Document reference types -- will move to entities.ts when that file is updated
export type DocumentReferenceType = 'context' | 'specification' | 'reference';

export interface DocumentReferenceSummary {
  document_id: string;
  document_title: string;
  type: DocumentReferenceType;
}

export interface DocumentReference {
  entity_type: EntityType;
  entity_id: string;
  document_id: string;
  type: DocumentReferenceType;
  created_at: string;
}

export interface CreateDocumentReferenceInput {
  entity_type: EntityType;
  entity_id: string;
  document_id: string;
  type: DocumentReferenceType;
}

export interface RemoveDocumentReferenceInput {
  entity_type: EntityType;
  entity_id: string;
  document_id: string;
}

export interface IProjectService {
  list(filter?: { id?: string; title?: string; limit?: number; offset?: number }): Paginated<ProjectSummary>;
  get(id: string): Project & { documents: DocumentReferenceSummary[] };
  create(inputs: CreateProjectInput[]): Project[];
  update(inputs: UpdateProjectInput[]): Project[];
  remove(ids: string[]): void;
}

export interface ITaskService {
  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string[]; effort?: string; impact?: string; category?: string; title?: string; blocked?: boolean }): Paginated<TaskSummary>;
  listGraphSummaries(projectId: string, status?: string[]): GraphTaskSummary[];
  get(id: string): Task;
  create(inputs: CreateTaskInput[]): Task[];
  update(inputs: UpdateTaskInput[]): Task[];
  statusCounts(projectIds: string[]): Record<string, { total: number; counts: Record<string, number> }>;
  remove(ids: string[]): void;
}

export interface ITaskDependencyService {
  addDependencies(projectId: string, deps: { source_task_id: string; target_task_id: string; dependency_type: string }[]): TaskDependency[];
  removeDependencies(pairs: { source_task_id: string; target_task_id: string }[]): void;
  getDependencies(taskId: string): { blocks: NormalizedDependencyDetail[]; blocked_by: NormalizedDependencyDetail[]; relates_to: NormalizedDependencyDetail[]; is_blocked: boolean };
  getGraph(projectId: string, statusFilter?: string[]): { edges: TaskDependency[]; blocked_task_ids: string[] };
}

export interface IDocumentService {
  list(filter?: { search?: string; title?: string; tag?: string; favorite?: boolean; project_id?: string; limit?: number; offset?: number }): Paginated<DocumentSummary>;
  get(id: string): Document & { tags: string[] };
  create(inputs: CreateDocumentInput[]): (Document & { tags: string[] })[];
  update(inputs: UpdateDocumentInput[]): (Document & { tags: string[] })[];
  remove(ids: string[]): void;
}

export interface IDocumentReferenceService {
  addReferences(inputs: CreateDocumentReferenceInput[]): DocumentReference[];
  removeReferences(inputs: RemoveDocumentReferenceInput[]): void;
  getReferencesForEntity(entityType: EntityType, entityId: string): DocumentReferenceSummary[];
  getEntitiesForDocument(documentId: string): { entity_type: EntityType; entity_id: string; type: DocumentReferenceType }[];
}
