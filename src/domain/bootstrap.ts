import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/migrator";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { EventBus } from "./events";

export interface AppContext {
  db: Database;
  eventBus: EventBus;
  projectService: ProjectService;
  taskService: TaskService;
}

export async function bootstrap(dbPath?: string): Promise<AppContext> {
  const db = createDatabase(dbPath);
  await runMigrations(db);

  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);

  const eventBus = new EventBus();

  const projectService = new ProjectService(projectRepo, eventBus);
  const taskService = new TaskService(taskRepo, projectRepo, eventBus);

  return { db, eventBus, projectService, taskService };
}
