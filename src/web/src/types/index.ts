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
  SemanticSearchResult,
  Automation,
  AutomationSummary,
  ProjectDocument,
  ProjectDocumentDetail,
  LinkedProject,
  ActivityLog,
  TaskStatus,
  EffortLevel,
  ImpactLevel,
  TaskCategory,
  EntityType,
  ActivityAction,
  TagName,
  SourceType,
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
  SOURCE_TYPES,
} from '@domain/entities';
