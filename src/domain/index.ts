export * from "./entities";
export * from "./inputs";
export * from "./errors";
export * from "./services";
export * from "./events";
export * from "./bootstrap";
export { createDatabase, getDbPath } from "./db/connection";
export { runMigrations } from "./db/migrator";
export {
  ProjectRepository,
  TaskRepository,
  ActivityLogRepository,
  DocumentRepository,
  TagRepository,
  DocumentReferenceRepository,
  TaskDependencyRepository,
} from "./repositories/sqlite";
export { ProjectService } from "./services/projects";
export { TaskService } from "./services/tasks";
export { DocumentReferenceService } from "./services/document-references";
export { TaskDependencyService } from "./services/task-dependencies";
export { ActivityLogService } from "./services/activity-log";
export { SourceService } from "./services/sources";
export { ProjectContextService } from "./services/project-context";
export { ConnectorRegistry, GitHubConnector } from "./connectors";
export type { SourceConnector, FetchResult, TreeEntry } from "./connectors";
