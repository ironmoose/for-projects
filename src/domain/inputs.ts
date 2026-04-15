import type { TaskStatus, EffortLevel, ImpactLevel, TaskCategory, TagName, DependencyType, DocumentReferenceType } from './entities';

/**
 * Merge-patch for document references on an entity.
 * - Key present with array of {type} objects: replaces all reference types for that document
 * - Key present with null: removes all references to that document
 * - Key absent: no change
 */
export type DocumentsMergePatch = Record<string, { type: DocumentReferenceType }[] | null>;

export interface CreateDocumentInput {
  title: string;
  summary?: string;
  content?: string;
  folder?: string;
  tags?: TagName[];
  favorite?: boolean;
}

export interface UpdateDocumentInput {
  id: string;
  title?: string;
  summary?: string | null;
  content?: string | null;
  folder?: string | null;
  tags?: TagName[];
  favorite?: boolean;
}

export interface ImportDocumentInput {
  url: string;
  folder?: string;
  tags?: TagName[];
  favorite?: boolean;
}

export interface CreateProjectInput {
  title: string;
  summary?: string;
  context?: string;
  requirements?: string;
  /** Merge-patch for document references on create. Key = document_id. Array = types for that doc. null values are silently ignored (no existing refs to remove). */
  documents?: DocumentsMergePatch;
}

export interface UpdateProjectInput {
  id: string;
  title?: string;
  summary?: string | null;
  context?: string | null;
  requirements?: string | null;
  /** Merge-patch for document references. Key = document_id. Array = replace types for that doc. null = remove all refs. Absent key = untouched. */
  documents?: DocumentsMergePatch;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  summary?: string;
  context?: string;
  acceptance_criteria?: string;
  group_key?: string;
  status?: TaskStatus;
  effort?: EffortLevel;
  impact?: ImpactLevel;
  category?: TaskCategory;
  /** Merge-patch for document references on create. Key = document_id. Array = types for that doc. null values are silently ignored (no existing refs to remove). */
  documents?: DocumentsMergePatch;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  summary?: string | null;
  context?: string | null;
  acceptance_criteria?: string | null;
  group_key?: string | null;
  status?: TaskStatus;
  effort?: EffortLevel | null;
  impact?: ImpactLevel | null;
  category?: TaskCategory | null;
  is_blocked?: boolean;
  add_dependencies?: { task_id: string; type: DependencyType }[];
  remove_dependencies?: { task_id: string }[];
  /** Merge-patch for document references. Key = document_id. Array = replace types for that doc. null = remove all refs. Absent key = untouched. */
  documents?: DocumentsMergePatch;
}

export interface CreateAutomationInput {
  title: string;
  summary?: string;
  prompt?: string;
  agent?: string;
  category?: string;
  is_favorite?: boolean;
  tags?: TagName[];
}

export interface UpdateAutomationInput {
  id: string;
  title?: string;
  summary?: string | null;
  prompt?: string | null;
  agent?: string | null;
  category?: string | null;
  is_favorite?: boolean;
  tags?: TagName[];
}
