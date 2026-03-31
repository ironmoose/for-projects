import type { Project, Task, Agent, Job } from "./entities";
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
  list(filter?: { id?: string; limit?: number; offset?: number }): Paginated<Project>;
  get(id: string): Project;
  create(inputs: CreateProjectInput[]): Project[];
  update(inputs: UpdateProjectInput[]): Project[];
  remove(ids: string[]): void;
}

export interface IAgentService {
  list(filter?: { id?: string; limit?: number; offset?: number }): Paginated<Agent>;
  get(id: string): Agent;
  create(inputs: CreateAgentInput[]): Agent[];
  update(inputs: UpdateAgentInput[]): Agent[];
  remove(ids: string[]): void;
}

export interface IJobService {
  list(filter?: { id?: string; agent_id?: string; status?: string; limit?: number; offset?: number }): Paginated<Job>;
  get(id: string): Job;
  create(inputs: CreateJobInput[]): Job[];
  update(inputs: UpdateJobInput[]): Job[];
  remove(ids: string[]): void;
}

export interface ITaskService {
  list(filter?: { id?: string; limit?: number; offset?: number; project_id?: string }): Paginated<Task>;
  get(id: string): Task;
  create(inputs: CreateTaskInput[]): Task[];
  update(inputs: UpdateTaskInput[]): Task[];
  remove(ids: string[]): void;
}
