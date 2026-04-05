import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/migrator";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { DocumentRepository } from "./repositories/documents";
import { TagRepository } from "./repositories/tags";
import { DocumentReferenceRepository } from "./repositories/document-references";
import { TaskDependencyRepository } from "./repositories/task-dependencies";
import { ActivityLogRepository } from "./repositories/activity-log";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { TaskDependencyService } from "./services/task-dependencies";
import { DocumentReferenceService } from "./services/document-references";
import { DocumentService } from "./services/documents";
import { EventBus } from "./events";

export interface AppContext {
  db: Database;
  eventBus: EventBus;
  projectService: ProjectService;
  taskService: TaskService;
  taskDependencyService: TaskDependencyService;
  documentService: DocumentService;
  documentReferenceService: DocumentReferenceService;
  activityLogRepo: ActivityLogRepository;
}

export async function bootstrap(dbPath?: string): Promise<AppContext> {
  const db = createDatabase(dbPath);
  await runMigrations(db);

  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const documentRepo = new DocumentRepository(db);
  const tagRepo = new TagRepository(db);
  const documentReferenceRepo = new DocumentReferenceRepository(db);
  const taskDependencyRepo = new TaskDependencyRepository(db);
  const activityLogRepo = new ActivityLogRepository(db);

  const eventBus = new EventBus();

  const documentReferenceService = new DocumentReferenceService(documentReferenceRepo, documentRepo, activityLogRepo, eventBus);
  const taskDependencyService = new TaskDependencyService(taskDependencyRepo, taskRepo, activityLogRepo, eventBus);
  const projectService = new ProjectService(projectRepo, activityLogRepo, eventBus, documentReferenceService);
  const taskService = new TaskService(taskRepo, projectRepo, activityLogRepo, eventBus, taskDependencyRepo, taskDependencyService, documentReferenceService);
  const documentService = new DocumentService(documentRepo, tagRepo, activityLogRepo, eventBus, documentReferenceRepo);

  return { db, eventBus, projectService, taskService, taskDependencyService, documentService, documentReferenceService, activityLogRepo };
}
