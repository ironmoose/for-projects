import type { TaskStatus, EffortLevel, ImpactLevel, TaskCategory, TagName, DependencyType } from './entities';

/**
 * Merge-patch for a project's linked documents.
 * - Key present with `true`: link the document (no-op if already linked).
 * - Key present with `null`: unlink the document.
 * - Key absent: no change.
 *
 * Tasks do not hold document links (migration 025 stripped them, migration 031
 * dropped the underlying table).
 */
export type DocumentsMergePatch = Record<string, true | null>;

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
  /** Merge-patch for project documents on create. Key = document_id; `true` = link, `null` = unlink (no-op on create). */
  documents?: DocumentsMergePatch;
}

export interface UpdateProjectInput {
  id: string;
  title?: string;
  summary?: string | null;
  context?: string | null;
  requirements?: string | null;
  /** Merge-patch for project documents. Key = document_id; `true` = link, `null` = unlink. Absent key = untouched. */
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
