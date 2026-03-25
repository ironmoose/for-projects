import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/schema";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import type { IProjectService, ITaskService } from "./services";

export interface AppContext {
  db: Database;
  projectService: IProjectService;
  taskService: ITaskService;
}

export function bootstrap(dbPath?: string): AppContext {
  const db = createDatabase(dbPath);
  runMigrations(db);

  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const projectService = new ProjectService(projectRepo);
  const taskService = new TaskService(taskRepo, projectRepo);

  return { db, projectService, taskService };
}
