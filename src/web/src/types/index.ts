// ---------------------------------------------------------------------------
// Domain types — re-exported from the canonical source
// ---------------------------------------------------------------------------

export type {
  Project,
  ProjectSummary,
  Task,
  TaskSummary,
  Document,
  DocumentSummary,
  DocumentReference,
  DocumentReferenceSummary,
  DocumentReferenceDetail,
  DocumentReferenceType,
  LinkedProject,
  ActivityLog,
  TaskStatus,
  EffortLevel,
  ImpactLevel,
  TaskCategory,
  EntityType,
  ActivityAction,
  TagName,
} from '@domain/entities';

export {
  TASK_STATUSES,
  EFFORT_LEVELS,
  IMPACT_LEVELS,
  TASK_CATEGORIES,
  ENTITY_TYPES,
  ACTIVITY_ACTIONS,
  TAG_NAMES,
  TAG_CATEGORIES,
  DOCUMENT_REFERENCE_TYPES,
} from '@domain/entities';

// ---------------------------------------------------------------------------
// Convenience aliases (used by shared document-reference UI components)
// ---------------------------------------------------------------------------

export { DOCUMENT_REFERENCE_TYPES as REFERENCE_TYPES } from '@domain/entities';
export type { DocumentReferenceType as ReferenceType } from '@domain/entities';
