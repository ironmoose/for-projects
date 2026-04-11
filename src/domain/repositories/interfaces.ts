/**
 * Repository interfaces — the contract between services and data access.
 * Both SQLite and Postgres repositories implement these.
 */
import type {
  Project, ProjectSummary,
  Task, TaskSummary, GraphTaskSummary,
  Document, DocumentSummary, SemanticSearchResult,
  Tag, EntityType, TagName,
  DocumentReference, DocumentReferenceSummary, DocumentReferenceDetail, DocumentReferenceType,
  TaskDependency, TaskDependencyDetail, DependencyType,
  ActivityLog,
} from "../entities";

// -- Projects ---------------------------------------------------------------

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findMany(filter?: { id?: string; title?: string; limit?: number; offset?: number }): Promise<Project[]>;
  findManySummary(filter?: { id?: string; title?: string; limit?: number; offset?: number }): Promise<ProjectSummary[]>;
  count(filter?: { id?: string; title?: string }): Promise<number>;
  insertMany(rows: { title: string; summary?: string | null; context?: string | null; requirements?: string | null }[]): Promise<Project[]>;
  updateMany(rows: { id: string; title?: string; summary?: string | null; context?: string | null; requirements?: string | null }[]): Promise<Project[]>;
  deleteMany(ids: string[]): Promise<void>;
}

// -- Tasks ------------------------------------------------------------------

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findMany(filter?: { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string[]; effort?: string; impact?: string; category?: string; title?: string; blocked?: boolean }): Promise<Task[]>;
  findManySummary(filter?: { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string[]; effort?: string; impact?: string; category?: string; title?: string; blocked?: boolean }): Promise<TaskSummary[]>;
  findGraphSummaries(projectId: string, status?: string[]): Promise<GraphTaskSummary[]>;
  count(filter?: { id?: string; project_id?: string; group_key?: string; status?: string[]; effort?: string; impact?: string; category?: string; title?: string; blocked?: boolean }): Promise<number>;
  insertMany(rows: { project_id: string; title: string; summary?: string | null; context?: string | null; acceptance_criteria?: string | null; group_key?: string | null; status: string; effort?: string | null; impact?: string | null; category?: string | null }[]): Promise<Task[]>;
  updateMany(rows: { id: string; title?: string; summary?: string | null; context?: string | null; acceptance_criteria?: string | null; group_key?: string | null; status?: string; effort?: string | null; impact?: string | null; category?: string | null; is_blocked?: boolean }[]): Promise<Task[]>;
  getStatusCountsByProject(projectIds: string[]): Promise<Record<string, Record<string, number>>>;
  deleteMany(ids: string[]): Promise<void>;
}

// -- Documents --------------------------------------------------------------

export interface IDocumentRepository {
  findById(id: string): Promise<Document | null>;
  findMany(filter?: { search?: string; title?: string; tag?: string; favorite?: boolean; folder?: string; doc_ids?: string[]; limit?: number; offset?: number }): Promise<DocumentSummary[]>;
  count(filter?: { search?: string; title?: string; tag?: string; favorite?: boolean; folder?: string; doc_ids?: string[] }): Promise<number>;
  insertMany(rows: { title: string; summary?: string | null; content?: string | null; folder?: string | null; favorite?: number | boolean; source_url?: string | null; source_type?: string | null; source_fetched_at?: string | null }[]): Promise<Document[]>;
  updateMany(rows: { id: string; title?: string; summary?: string | null; content?: string | null; folder?: string | null; favorite?: boolean; source_url?: string | null; source_type?: string | null; source_fetched_at?: string | null }[]): Promise<Document[]>;
  deleteMany(ids: string[]): Promise<void>;
  /** Vector similarity search. Returns null if not supported (SQLite). */
  semanticSearch?(queryEmbedding: number[], filter?: { tag?: string; folder?: string; favorite?: boolean; limit?: number; queryText?: string }): Promise<SemanticSearchResult[]>;
}

// -- Tags -------------------------------------------------------------------

export interface ITagRepository {
  findOrCreateByKind(kind: string): Promise<Tag>;
  findByKinds(kinds: string[]): Promise<Tag[]>;
  setTagsForEntity(entityType: EntityType, entityId: string, tagKinds: string[]): Promise<void>;
  getTagsForEntities(entityType: EntityType, entityIds: string[]): Promise<Map<string, TagName[]>>;
  getTagsForEntity(entityType: EntityType, entityId: string): Promise<Tag[]>;
  findEntitiesByTag(tagKind: string, entityType?: EntityType): Promise<{ entity_type: string; entity_id: string }[]>;
  removeTagsForEntity(entityType: EntityType, entityId: string): Promise<void>;
}

// -- Document references ----------------------------------------------------

export interface IDocumentReferenceRepository {
  setReferencesForEntityDocument(entityType: string, entityId: string, documentId: string, types: DocumentReferenceType[]): Promise<void>;
  removeReferencesForEntityDocument(entityType: string, entityId: string, documentId: string): Promise<void>;
  removeAllForEntity(entityType: string, entityId: string): Promise<void>;
  removeAllForDocument(documentId: string): Promise<void>;
  getReferencesForEntity(entityType: string, entityId: string): Promise<DocumentReference[]>;
  getReferencesForEntityWithDocumentTitles(entityType: string, entityId: string): Promise<DocumentReferenceSummary[]>;
  getReferencesForEntities(entityType: string, entityIds: string[]): Promise<Map<string, DocumentReferenceSummary[]>>;
  findByEntity(entityType: string, entityId: string): Promise<DocumentReferenceDetail[]>;
  getProjectsForDocuments(documentIds: string[]): Promise<Map<string, { id: string; title: string }[]>>;
  getEntitiesForDocument(documentId: string): Promise<DocumentReference[]>;
  getEntitiesForDocumentWithTitles(documentId: string): Promise<{ entity_type: string; entity_id: string; entity_title: string; type: string }[]>;
}

// -- Task dependencies ------------------------------------------------------

export interface ITaskDependencyRepository {
  addDependencies(deps: { source_task_id: string; target_task_id: string; dependency_type: DependencyType }[]): Promise<TaskDependency[]>;
  removeDependencies(pairs: { source_task_id: string; target_task_id: string }[]): Promise<void>;
  getDependenciesFrom(taskId: string): Promise<TaskDependencyDetail[]>;
  getDependenciesTo(taskId: string): Promise<TaskDependencyDetail[]>;
  getGraphForProject(projectId: string): Promise<TaskDependency[]>;
  getBlockedTaskIds(projectId: string): Promise<string[]>;
  isTaskBlocked(taskId: string): Promise<boolean>;
}

// -- Activity log -----------------------------------------------------------

export interface IActivityLogRepository {
  insert(row: { entity_type: string; entity_id: string | null; action: string; summary: string }): Promise<ActivityLog>;
  findMany(filter?: { entity_type?: string; entity_id?: string; limit?: number; offset?: number }): Promise<ActivityLog[]>;
  count(filter?: { entity_type?: string; entity_id?: string }): Promise<number>;
  countAll(): Promise<number>;
  deleteOlderThan(cutoffDate: string): Promise<number>;
}
