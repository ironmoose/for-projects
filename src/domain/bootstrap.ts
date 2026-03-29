import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/migrator";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { ActionRepository } from "./repositories/actions";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { ActionService } from "./services/actions";
import { EventBus } from "./events";

export interface AppContext {
  db: Database;
  eventBus: EventBus;
  projectService: ProjectService;
  taskService: TaskService;
  actionService: ActionService;
}

export async function bootstrap(dbPath?: string): Promise<AppContext> {
  const db = createDatabase(dbPath);
  await runMigrations(db);

  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const actionRepo = new ActionRepository(db);

  const eventBus = new EventBus();

  const projectService = new ProjectService(projectRepo, actionRepo, eventBus);
  const taskService = new TaskService(taskRepo, projectRepo, actionRepo, eventBus);
  const actionService = new ActionService(actionRepo, eventBus);

  return { db, eventBus, projectService, taskService, actionService };
}
