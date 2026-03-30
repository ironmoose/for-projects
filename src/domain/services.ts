import type { Project, Task, Agent, Session, Run, RunDailyStats, RunSummaryStats, AgentType, RunStatus, EntityType } from "./entities";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateAgentInput,
  UpdateAgentInput,
  CreateSessionInput,
  UpdateSessionInput,
  CreateRunInput,
  UpdateRunInput,
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

export interface IAgentService {
  list(filter?: { id?: string; limit?: number; offset?: number; identifier?: string; enabled?: boolean }): Paginated<Agent>;
  get(id: string): Agent;
  create(inputs: CreateAgentInput[]): Agent[];
  update(inputs: UpdateAgentInput[]): Agent[];
  remove(ids: string[]): void;
}

export interface ISessionService {
  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string }): Paginated<Session>;
  get(id: string): Session;
  create(inputs: CreateSessionInput[]): Session[];
  update(inputs: UpdateSessionInput[]): Session[];
  remove(ids: string[]): void;
}

export interface IRunService {
  list(filter?: {
    id?: string;
    limit?: number;
    offset?: number;
    entity_type?: EntityType;
    entity_id?: string;
    session_id?: string;
    agent?: string;
    status?: RunStatus;
    search?: string;
    started_after?: string;
    started_before?: string;
    finished_after?: string;
    agent_identifier?: string;
  }): Paginated<Run>;
  get(id: string): Run;
  create(inputs: CreateRunInput[]): Run[];
  update(inputs: UpdateRunInput[]): Run[];
  stats(days?: number): { daily: RunDailyStats[]; summary: RunSummaryStats };
  remove(ids: string[]): void;
}
