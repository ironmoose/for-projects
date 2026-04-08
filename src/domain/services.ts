import type { Project, ProjectSummary, Task, TaskSummary, GraphTaskSummary, Document, DocumentSummary, TaskDependency, NormalizedDependencyDetail, DocumentReference, DocumentReferenceSummary, DocumentReferenceDetail, DocumentReferenceType, EntityType } from "./entities";
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
  get(id: string): Project & { documents: DocumentReferenceDetail[] };
  create(inputs: CreateProjectInput[]): (Project & { documents: DocumentReferenceSummary[] })[];
  update(inputs: UpdateProjectInput[]): Project[];
  remove(ids: string[]): void;
}

export interface ITaskService {
  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string[]; effort?: string; impact?: string; category?: string; title?: string; blocked?: boolean }): Paginated<TaskSummary>;
  listGraphSummaries(projectId: string, status?: string[]): GraphTaskSummary[];
  get(id: string): Task & { documents: DocumentReferenceDetail[] };
  create(inputs: CreateTaskInput[]): (Task & { documents: DocumentReferenceSummary[] })[];
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

export interface IDocumentReferenceService {
  /** Validate a merge-patch without applying it. Throws ServiceError on invalid types or missing documents. */
  validateMergePatch(documents: Record<string, { type: DocumentReferenceType }[] | null>): void;
  applyMergePatch(entityType: EntityType, entityId: string, documents: Record<string, { type: DocumentReferenceType }[] | null>): void;
  getReferencesForEntity(entityType: EntityType, entityId: string): DocumentReferenceSummary[];
  findByEntity(entityType: EntityType, entityId: string): DocumentReferenceDetail[];
  getEntitiesForDocument(documentId: string): DocumentReference[];
  removeAllForEntity(entityType: EntityType, entityId: string): void;
  removeAllForDocument(documentId: string): void;
}

export interface IDocumentService {
  list(filter?: { search?: string; title?: string; tag?: string; favorite?: boolean; folder?: string; project_id?: string; entity_type?: string; entity_id?: string; limit?: number; offset?: number }): Paginated<DocumentSummary>;
  get(id: string): Document & { tags: string[]; referenced_by: { entity_type: string; entity_id: string; entity_title: string; type: string }[] };
  create(inputs: CreateDocumentInput[]): (Document & { tags: string[] })[];
  update(inputs: UpdateDocumentInput[]): (Document & { tags: string[] })[];
  remove(ids: string[]): void;
}
