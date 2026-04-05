import type { TaskStatus, EffortLevel, ImpactLevel, TaskCategory, TagName, DependencyType, DocumentReferenceType } from './entities';

export interface CreateDocumentInput {
  title: string;
  summary?: string;
  content?: string;
  folder?: string;
  tags?: TagName[];
  favorite?: boolean;
  folder?: string | null;
}

export interface UpdateDocumentInput {
  id: string;
  title?: string;
  summary?: string | null;
  content?: string | null;
  folder?: string | null;
  tags?: TagName[];
  favorite?: boolean;
  folder?: string | null;
}

export interface CreateProjectInput {
  title: string;
  summary?: string;
  /** Merge-patch for document references on create. Key = document_id. Array = types for that doc. null values are silently ignored (no existing refs to remove). */
  documents?: Record<string, { type: DocumentReferenceType }[] | null>;
}

export interface UpdateProjectInput {
  id: string;
  title?: string;
  summary?: string | null;
  /** Merge-patch for document references. Key = document_id. Array = replace types for that doc. null = remove all refs. Absent key = untouched. */
  documents?: Record<string, { type: DocumentReferenceType }[] | null>;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  summary?: string;
  group_key?: string;
  status?: TaskStatus;
  effort?: EffortLevel;
  impact?: ImpactLevel;
  category?: TaskCategory;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  summary?: string | null;
  group_key?: string | null;
  status?: TaskStatus;
  effort?: EffortLevel | null;
  impact?: ImpactLevel | null;
  category?: TaskCategory | null;
  add_dependencies?: { task_id: string; type: DependencyType }[];
  remove_dependencies?: { task_id: string }[];
}
