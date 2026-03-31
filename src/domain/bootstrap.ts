import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/migrator";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { AgentRepository } from "./repositories/agents";
import { JobRepository } from "./repositories/jobs";
import { ActivityLogRepository } from "./repositories/activity-log";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { AgentService } from "./services/agents";
import { JobService } from "./services/jobs";
import { EventBus } from "./events";

export interface AppContext {
  db: Database;
  eventBus: EventBus;
  projectService: ProjectService;
  taskService: TaskService;
  agentService: AgentService;
  jobService: JobService;
  activityLogRepo: ActivityLogRepository;
}

export async function bootstrap(dbPath?: string): Promise<AppContext> {
  const db = createDatabase(dbPath);
  await runMigrations(db);

  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const agentRepo = new AgentRepository(db);
  const jobRepo = new JobRepository(db);
  const activityLogRepo = new ActivityLogRepository(db);

  const eventBus = new EventBus();

  const projectService = new ProjectService(projectRepo, activityLogRepo, eventBus);
  const taskService = new TaskService(taskRepo, projectRepo, activityLogRepo, eventBus);
  const agentService = new AgentService(agentRepo, activityLogRepo, eventBus);
  const jobService = new JobService(jobRepo, agentRepo, activityLogRepo, eventBus);

  return { db, eventBus, projectService, taskService, agentService, jobService, activityLogRepo };
}
