import type { Project, Task, Action, ActionLogEntry, ActionLogDailyStats, ActionLogSummaryStats, ActionKind, AgentType, ActionLogStatus, ActionLogStats, EntityType } from "./entities";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateActionInput,
  UpdateActionInput,
  CreateActionLogInput,
  UpdateActionLogInput,
} from "./inputs";

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface IProjectService {
  list(filter?: { id?: string; limit?: number; offset?: number }): Paginated<Project>;
  get(id: string): Project;
  create(inputs: CreateProjectInput[]): Project[];
  update(inputs: UpdateProjectInput[]): Project[];
  remove(ids: string[]): void;
}

export interface ITaskService {
  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string }): Paginated<Task>;
  get(id: string): Task;
  create(inputs: CreateTaskInput[]): Task[];
  update(inputs: UpdateTaskInput[]): Task[];
  remove(ids: string[]): void;
}

export interface IActionService {
  list(filter?: { id?: string; limit?: number; offset?: number; kind?: ActionKind }): Paginated<Action>;
  get(id: string): Action;
  create(inputs: CreateActionInput[]): Action[];
  update(inputs: UpdateActionInput[]): Action[];
  remove(ids: string[]): void;
}

export interface IActionLogService {
  list(filter?: {
    id?: string;
    limit?: number;
    offset?: number;
    entity_type?: EntityType;
    entity_id?: string;
    action_id?: string;
    status?: ActionLogStatus;
    search?: string;
    started_after?: string;
    started_before?: string;
    finished_after?: string;
    action_kind?: string;
  }): Paginated<ActionLogEntry>;
  get(id: string): ActionLogEntry;
  create(inputs: CreateActionLogInput[]): ActionLogEntry[];
  update(inputs: UpdateActionLogInput[]): ActionLogEntry[];
  stats(days?: number): { daily: ActionLogDailyStats[]; summary: ActionLogSummaryStats };
}
