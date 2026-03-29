import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/migrator";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { ActionRepository } from "./repositories/actions";
import { EntityActionRepository } from "./repositories/entity-actions";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { ActionService } from "./services/actions";
import { EntityActionService } from "./services/entity-actions";
import { RunnerService } from "./services/runner";
import { EventBus } from "./events";

export interface AppContext {
  db: Database;
  eventBus: EventBus;
  projectService: ProjectService;
  taskService: TaskService;
  actionService: ActionService;
  entityActionService: EntityActionService;
  runnerService: RunnerService;
}

export async function bootstrap(dbPath?: string): Promise<AppContext> {
  const db = createDatabase(dbPath);
  await runMigrations(db);

  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const actionRepo = new ActionRepository(db);
  const entityActionRepo = new EntityActionRepository(db);

  const eventBus = new EventBus();

  const projectService = new ProjectService(projectRepo, eventBus);
  const taskService = new TaskService(taskRepo, projectRepo, eventBus);
  const actionService = new ActionService(actionRepo, eventBus);
  const entityActionService = new EntityActionService(entityActionRepo, actionRepo, projectRepo, taskRepo, eventBus);
  const runnerService = new RunnerService(entityActionRepo, actionRepo, projectRepo, taskRepo, eventBus);

  return { db, eventBus, projectService, taskService, actionService, entityActionService, runnerService };
}
