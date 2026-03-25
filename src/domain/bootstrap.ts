import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/schema";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { TagRepository } from "./repositories/tags";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { TagService } from "./services/tags";
import type { IProjectService, ITaskService, ITagService } from "./services";
import { EventBus } from "./events";

export interface AppContext {
  db: Database;
  projectService: IProjectService;
  taskService: ITaskService;
  tagService: ITagService;
  eventBus: EventBus;
}

export function bootstrap(dbPath?: string): AppContext {
  const db = createDatabase(dbPath);
  runMigrations(db);

  const eventBus = new EventBus();
  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const tagRepo = new TagRepository(db);
  const projectService = new ProjectService(projectRepo, eventBus);
  const taskService = new TaskService(taskRepo, projectRepo, eventBus);
  const tagService = new TagService(tagRepo, taskRepo);

  return { db, projectService, taskService, tagService, eventBus };
}
