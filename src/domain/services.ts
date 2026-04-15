import type { Project, ProjectSummary, Task, TaskSummary, GraphTaskSummary, Document, DocumentSummary, SemanticSearchResult, Automation, AutomationSummary, TagName, TaskDependency, NormalizedDependencyDetail, DocumentReference, DocumentReferenceSummary, DocumentReferenceDetail, DocumentReferenceType, EntityType, ActivityLog } from "./entities";
import type { TreeEntry } from "./connectors/types";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateDocumentInput,
  UpdateDocumentInput,
  CreateAutomationInput,
  UpdateAutomationInput,
  ImportDocumentInput,
} from "./inputs";

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface IProjectService {
  list(filter?: { id?: string; title?: string; limit?: number; offset?: number }): Promise<Paginated<ProjectSummary>>;
  get(id: string): Promise<Project & { documents: DocumentReferenceDetail[] }>;
  create(inputs: CreateProjectInput[]): Promise<(Project & { documents: DocumentReferenceSummary[] })[]>;
  update(inputs: UpdateProjectInput[]): Promise<Project[]>;
  remove(ids: string[]): Promise<void>;
}

export interface ITaskService {
  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string[]; effort?: string; impact?: string; category?: string; title?: string; blocked?: boolean }): Promise<Paginated<TaskSummary>>;
  listGraphSummaries(projectId: string, status?: string[]): Promise<GraphTaskSummary[]>;
  get(id: string): Promise<Task & { documents: DocumentReferenceDetail[] }>;
  create(inputs: CreateTaskInput[]): Promise<(Task & { documents: DocumentReferenceSummary[] })[]>;
  update(inputs: UpdateTaskInput[]): Promise<Task[]>;
  statusCounts(projectIds: string[]): Promise<Record<string, { total: number; counts: Record<string, number> }>>;
  remove(ids: string[]): Promise<void>;
}

export interface ITaskDependencyService {
  addDependencies(projectId: string, deps: { source_task_id: string; target_task_id: string; dependency_type: string }[]): Promise<TaskDependency[]>;
  removeDependencies(projectId: string, pairs: { source_task_id: string; target_task_id: string }[]): Promise<void>;
  getDependencies(taskId: string): Promise<{ blocks: NormalizedDependencyDetail[]; blocked_by: NormalizedDependencyDetail[]; relates_to: NormalizedDependencyDetail[]; is_blocked: boolean }>;
  getGraph(projectId: string, statusFilter?: string[]): Promise<{ edges: TaskDependency[]; blocked_task_ids: string[] }>;
}

export interface IDocumentReferenceService {
  /** Validate a merge-patch without applying it. Throws ServiceError on invalid types or missing documents. */
  validateMergePatch(documents: Record<string, { type: DocumentReferenceType }[] | null>): Promise<void>;
  applyMergePatch(entityType: EntityType, entityId: string, documents: Record<string, { type: DocumentReferenceType }[] | null>): Promise<void>;
  getReferencesForEntity(entityType: EntityType, entityId: string): Promise<DocumentReferenceSummary[]>;
  findByEntity(entityType: EntityType, entityId: string): Promise<DocumentReferenceDetail[]>;
  getEntitiesForDocument(documentId: string): Promise<DocumentReference[]>;
  removeAllForEntity(entityType: EntityType, entityId: string): Promise<void>;
  removeAllForDocument(documentId: string): Promise<void>;
}

export interface IActivityLogService {
  list(filter?: { entity_type?: string; entity_id?: string; limit?: number; offset?: number }): Promise<Paginated<ActivityLog>>;
}

export interface ISourceService {
  import(input: ImportDocumentInput): Promise<Document & { tags: string[] }>;
  importBatch(inputs: ImportDocumentInput[]): Promise<(Document & { tags: string[] })[]>;
  refresh(documentId: string): Promise<Document & { tags: string[] }>;
  browseRepo(repoUrl: string, query?: string): Promise<TreeEntry[]>;
}

export interface ProjectContextMeta {
  tiers_included: number;
  truncated: boolean;
  estimated_tokens: number;
  focus: string;
}

export interface ProjectContextResult {
  _meta: ProjectContextMeta;
  [key: string]: unknown;
}

export interface IProjectContextService {
  getProjectContext(options: {
    project_id: string;
    max_tokens?: number;
    focus?: string;
    since?: string;
  }): Promise<ProjectContextResult>;
}

export interface IAutomationService {
  list(filter?: { title?: string; category?: string; is_favorite?: boolean; tag?: string; limit?: number; offset?: number }): Promise<Paginated<AutomationSummary>>;
  get(id: string): Promise<Automation & { tags: TagName[] }>;
  create(inputs: CreateAutomationInput[]): Promise<(Automation & { tags: TagName[] })[]>;
  update(inputs: UpdateAutomationInput[]): Promise<(Automation & { tags: TagName[] })[]>;
  remove(ids: string[]): Promise<void>;
}

export interface IDocumentService {
  list(filter?: { search?: string; title?: string; tag?: string; favorite?: boolean; folder?: string; project_id?: string; entity_type?: string; entity_id?: string; limit?: number; offset?: number }): Promise<Paginated<DocumentSummary>>;
  get(id: string): Promise<Document & { tags: string[]; referenced_by: { entity_type: string; entity_id: string; entity_title: string; type: string }[] }>;
  create(inputs: CreateDocumentInput[]): Promise<(Document & { tags: string[] })[]>;
  update(inputs: UpdateDocumentInput[]): Promise<(Document & { tags: string[] })[]>;
  remove(ids: string[]): Promise<void>;
  removeByFolder(folder: string): Promise<void>;
  /** Semantic search — returns documents ranked by vector similarity with their reference context. Returns empty array on SQLite. */
  semanticSearch(query: string, filter?: { tag?: string; folder?: string; favorite?: boolean; limit?: number }): Promise<SemanticSearchResult[]>;
}
