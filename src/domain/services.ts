import type { Project, ProjectSummary, Task, TaskSummary, Agent, AgentSummary, Job, JobSummary } from "./entities";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateAgentInput,
  UpdateAgentInput,
  CreateJobInput,
  UpdateJobInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "./inputs";

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface IProjectService {
  list(filter?: { id?: string; limit?: number; offset?: number }): Paginated<ProjectSummary>;
  get(id: string): Project;
  create(inputs: CreateProjectInput[]): Project[];
  update(inputs: UpdateProjectInput[]): Project[];
  remove(ids: string[]): void;
}

export interface IAgentService {
  list(filter?: { id?: string; limit?: number; offset?: number }): Paginated<AgentSummary>;
  get(id: string): Agent;
  create(inputs: CreateAgentInput[]): Agent[];
  update(inputs: UpdateAgentInput[]): Agent[];
  remove(ids: string[]): void;
}

export interface IJobService {
  list(filter?: { id?: string; agent_id?: string; status?: string; limit?: number; offset?: number }): Paginated<JobSummary>;
  get(id: string): Job;
  create(inputs: CreateJobInput[]): Job[];
  update(inputs: UpdateJobInput[]): Job[];
  remove(ids: string[]): void;
}

export interface ITaskService {
  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string; group_key?: string; status?: string; effort?: string; impact?: string; category?: string; title?: string }): Paginated<TaskSummary>;
  get(id: string): Task;
  create(inputs: CreateTaskInput[]): Task[];
  update(inputs: UpdateTaskInput[]): Task[];
  remove(ids: string[]): void;
}
