import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/migrator";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { DocumentRepository } from "./repositories/documents";
import { TagRepository } from "./repositories/tags";
import { ProjectDocumentRepository } from "./repositories/project-documents";
import { TaskDependencyRepository } from "./repositories/task-dependencies";
import { ActivityLogRepository } from "./repositories/activity-log";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { TaskDependencyService } from "./services/task-dependencies";
import { DocumentService } from "./services/documents";
import { EventBus } from "./events";

export interface AppContext {
  db: Database;
  eventBus: EventBus;
  projectService: ProjectService;
  taskService: TaskService;
  taskDependencyService: TaskDependencyService;
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
  const taskDependencyRepo = new TaskDependencyRepository(db);
  const activityLogRepo = new ActivityLogRepository(db);

  const eventBus = new EventBus();

  const taskDependencyService = new TaskDependencyService(taskDependencyRepo, taskRepo, activityLogRepo, eventBus);
  const projectService = new ProjectService(projectRepo, activityLogRepo, eventBus, documentRepo, projectDocumentRepo, tagRepo);
  const taskService = new TaskService(taskRepo, projectRepo, activityLogRepo, eventBus, taskDependencyRepo, taskDependencyService);
  const documentService = new DocumentService(documentRepo, tagRepo, activityLogRepo, eventBus, projectDocumentRepo);

  return { db, eventBus, projectService, taskService, taskDependencyService, documentService, activityLogRepo };
}
