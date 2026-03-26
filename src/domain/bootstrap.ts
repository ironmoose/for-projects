import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/migrator";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { TagRepository } from "./repositories/tags";
import { WorkbenchRepository } from "./repositories/workbenches";
import { InstructionRepository, InstructionBindingRepository } from "./repositories/instructions";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { TagService } from "./services/tags";
import { WorkbenchService } from "./services/workbenches";
import { InstructionService, InstructionBindingService } from "./services/instructions";
import type {
  IProjectService, ITaskService, ITagService,
  IWorkbenchService,
  IInstructionService, IInstructionBindingService,
} from "./services";
import { EventBus } from "./events";
import type { ArnResolverMap } from "./arn";

export interface AppContext {
  db: Database;
  projectService: IProjectService;
  taskService: ITaskService;
  tagService: ITagService;
  workbenchService: IWorkbenchService;
  instructionService: IInstructionService;
  instructionBindingService: IInstructionBindingService;
  eventBus: EventBus;
}

export async function bootstrap(dbPath?: string): Promise<AppContext> {
  const db = createDatabase(dbPath);
  await runMigrations(db);

  const eventBus = new EventBus();
  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const tagRepo = new TagRepository(db);
  const workbenchRepo = new WorkbenchRepository(db);
  const instructionRepo = new InstructionRepository(db);
  const instructionBindingRepo = new InstructionBindingRepository(db);

  const arnResolvers: ArnResolverMap = {
    project: (id) => projectRepo.findById(id) !== null,
    task: (id) => taskRepo.findById(id) !== null,
    workbench: (id) => workbenchRepo.findById(id) !== null,
  };

  const projectService = new ProjectService(projectRepo, eventBus);
  const taskService = new TaskService(taskRepo, projectRepo, eventBus);
  const tagService = new TagService(tagRepo, taskRepo);
  const workbenchService = new WorkbenchService(workbenchRepo, eventBus);
  const instructionService = new InstructionService(instructionRepo, workbenchRepo, eventBus);
  const instructionBindingService = new InstructionBindingService(
    instructionBindingRepo, instructionRepo, arnResolvers, eventBus,
  );

  return {
    db, projectService, taskService, tagService,
    workbenchService,
    instructionService, instructionBindingService,
    eventBus,
  };
}
