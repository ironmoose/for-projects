import type { Database } from "bun:sqlite";
import { createDatabase } from "./db/connection";
import { runMigrations } from "./db/migrator";
import { ProjectRepository } from "./repositories/projects";
import { TaskRepository } from "./repositories/tasks";
import { TagRepository } from "./repositories/tags";
import { WorkflowRepository } from "./repositories/workflows";
import { PhaseRepository } from "./repositories/phases";
import { InstructionRepository, BindingRepository } from "./repositories/instructions";
import { ProjectService } from "./services/projects";
import { TaskService } from "./services/tasks";
import { TagService } from "./services/tags";
import { WorkflowService } from "./services/workflows";
import { PhaseService } from "./services/phases";
import { InstructionService, BindingService } from "./services/instructions";
import { ResolverService } from "./services/resolver";
import type {
  IProjectService, ITaskService, ITagService,
  IWorkflowService, IPhaseService,
  IInstructionService, IBindingService, IResolverService,
} from "./services";
import { EventBus } from "./events";
import type { ArnResolverMap, EntityResolverMap } from "./arn";

export interface AppContext {
  db: Database;
  projectService: IProjectService;
  taskService: ITaskService;
  tagService: ITagService;
  workflowService: IWorkflowService;
  phaseService: IPhaseService;
  instructionService: IInstructionService;
  bindingService: IBindingService;
  resolverService: IResolverService;
  eventBus: EventBus;
}

export async function bootstrap(dbPath?: string): Promise<AppContext> {
  const db = createDatabase(dbPath);
  await runMigrations(db);

  const eventBus = new EventBus();
  const projectRepo = new ProjectRepository(db);
  const taskRepo = new TaskRepository(db);
  const tagRepo = new TagRepository(db);
  const workflowRepo = new WorkflowRepository(db);
  const phaseRepo = new PhaseRepository(db);
  const instructionRepo = new InstructionRepository(db);
  const bindingRepo = new BindingRepository(db);

  const arnResolvers: ArnResolverMap = {
    project: (id) => projectRepo.findById(id) !== null,
    task: (id) => taskRepo.findById(id) !== null,
    workflow: (id) => workflowRepo.findById(id) !== null,
    phase: (id) => phaseRepo.findById(id) !== null,
    instruction: (id) => instructionRepo.findById(id) !== null,
  };

  const projectService = new ProjectService(projectRepo, eventBus);
  const taskService = new TaskService(taskRepo, projectRepo, eventBus);
  const tagService = new TagService(tagRepo, taskRepo);
  const workflowService = new WorkflowService(workflowRepo, eventBus);
  const phaseService = new PhaseService(phaseRepo, workflowRepo, eventBus);
  const instructionService = new InstructionService(instructionRepo, phaseRepo, eventBus);
  const bindingService = new BindingService(
    bindingRepo, instructionRepo, arnResolvers, eventBus,
  );

  const entityResolvers: EntityResolverMap = {
    project: (id) => projectService.findById(id),
    task: (id) => taskService.findById(id),
    workflow: (id) => workflowService.findById(id),
    phase: (id) => phaseService.findByIdDirect(id),
    instruction: (id) => instructionService.findByIdDirect(id),
  };

  const resolverService = new ResolverService(bindingService, entityResolvers);

  return {
    db, projectService, taskService, tagService,
    workflowService, phaseService,
    instructionService, bindingService,
    resolverService, eventBus,
  };
}
