import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/migrator";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { AgentRepository } from "./repositories/agents";
import { RunRepository } from "./repositories/runs";
import { SessionRepository } from "./repositories/sessions";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { AgentService } from "./services/agents";
import { SessionService } from "./services/sessions";
import { RunService } from "./services/runs";
import { EventBus } from "./events";

export interface AppContext {
  db: Database;
  eventBus: EventBus;
  projectService: ProjectService;
  taskService: TaskService;
  agentService: AgentService;
  sessionService: SessionService;
  runService: RunService;
}

export async function bootstrap(dbPath?: string): Promise<AppContext> {
  const db = createDatabase(dbPath);
  await runMigrations(db);

  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const agentRepo = new AgentRepository(db);
  const sessionRepo = new SessionRepository(db);
  const runRepo = new RunRepository(db);

  const eventBus = new EventBus();

  const projectService = new ProjectService(projectRepo, eventBus);
  const taskService = new TaskService(taskRepo, projectRepo, eventBus);
  const agentService = new AgentService(agentRepo, eventBus);
  const sessionService = new SessionService(sessionRepo, projectRepo, eventBus);
  const runService = new RunService(runRepo, agentRepo, eventBus);

  return { db, eventBus, projectService, taskService, agentService, sessionService, runService };
}
