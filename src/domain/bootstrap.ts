import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/migrator";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { DocumentRepository } from "./repositories/documents";
import { TagRepository } from "./repositories/tags";
import { ProjectDocumentRepository } from "./repositories/project-documents";
import { ActivityLogRepository } from "./repositories/activity-log";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { DocumentService } from "./services/documents";
import { EventBus } from "./events";

export interface AppContext {
  db: Database;
  eventBus: EventBus;
  projectService: ProjectService;
  taskService: TaskService;
  documentService: DocumentService;
  activityLogRepo: ActivityLogRepository;
}

export async function bootstrap(dbPath?: string): Promise<AppContext> {
  const db = createDatabase(dbPath);
  await runMigrations(db);

  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const documentRepo = new DocumentRepository(db);
  const tagRepo = new TagRepository(db);
  const projectDocumentRepo = new ProjectDocumentRepository(db);
  const activityLogRepo = new ActivityLogRepository(db);

  const eventBus = new EventBus();

  const projectService = new ProjectService(projectRepo, activityLogRepo, eventBus, documentRepo, projectDocumentRepo);
  const taskService = new TaskService(taskRepo, projectRepo, activityLogRepo, eventBus);
  const documentService = new DocumentService(documentRepo, tagRepo, activityLogRepo, eventBus);

  return { db, eventBus, projectService, taskService, documentService, activityLogRepo };
}
