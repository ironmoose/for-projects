import type { Project, Task, Action, ActionStatus, EntityAction, StartedActionResult, RunnerActionResult } from "./entities";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateActionInput,
  UpdateActionInput,
  CreateEntityActionInput,
} from "./inputs";

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface ProjectFilter {
  status?: string;
}

export interface TaskFilter {
  status?: string;
}

export interface IProjectService {
  findAll(limit?: number, offset?: number, filter?: ProjectFilter): Paginated<Project>;
  findById(id: string): Project | null;
  create(input: CreateProjectInput): Project;
  update(id: string, input: UpdateProjectInput): Project | null;
}

export interface ITaskService {
  findById(id: string): Task | null;
  findByProjectId(projectId: string, limit?: number, offset?: number, filter?: TaskFilter): Paginated<Task>;
  create(input: CreateTaskInput): Task;
  update(id: string, input: UpdateTaskInput): Task | null;
}

export interface ActionFilter {
  agent?: string;
}

export interface IActionService {
  findAll(limit?: number, offset?: number, filter?: ActionFilter): Paginated<Action>;
  findById(id: string): Action | null;
  create(input: CreateActionInput): Action;
  update(id: string, input: UpdateActionInput): Action | null;
}

export interface EntityActionFilter {
  entity_type?: string;
  entity_id?: string;
  role?: string;
  status?: string;
}

export interface IEntityActionService {
  link(input: CreateEntityActionInput): EntityAction;
  unlink(entity_type: string, entity_id: string, role: string): boolean;
  updateStatus(entity_type: string, entity_id: string, role: string, status: ActionStatus): EntityAction;
  updateOutput(entity_type: string, entity_id: string, role: string, output: string | null): EntityAction;
  findByEntity(entity_type: string, entity_id: string): EntityAction[];
  findByEntityAndRole(entity_type: string, entity_id: string, role: string): EntityAction | null;
  findAll(limit?: number, offset?: number, filter?: EntityActionFilter): Paginated<EntityAction>;
}

export interface IRunnerService {
  start(): StartedActionResult;
  complete(entity_type: string, entity_id: string, role: string, output: string): RunnerActionResult;
  fail(entity_type: string, entity_id: string, role: string, output?: string): RunnerActionResult;
}
