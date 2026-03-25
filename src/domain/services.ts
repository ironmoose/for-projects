import type { Project, Task, Tag } from "./entities";
import type { ProjectStatus, TaskStatus, TaskType, TaskEffort } from "./statuses";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
} from "./inputs";

export interface Paginated<T> {
  data: T[];
  total: number;
}

export interface ProjectFilter {
  status?: ProjectStatus;
}

export interface TaskFilter {
  status?: TaskStatus;
  type?: TaskType;
  effort?: TaskEffort;
  tag?: string;
  tag_prefix?: string;
}

export interface IProjectService {
  findAll(limit?: number, offset?: number, filter?: ProjectFilter): Paginated<Project>;
  findBySlug(slug: string): Project | null;
  create(input: CreateProjectInput): Project;
  update(slug: string, input: UpdateProjectInput): Project | null;
  delete(slug: string): boolean;
}

export interface ITaskService {
  findByProjectSlug(projectSlug: string, limit?: number, offset?: number, filter?: TaskFilter): Paginated<Task>;
  findByNumber(projectSlug: string, number: number): Task | null;
  create(projectSlug: string, input: CreateTaskInput): Task;
  update(projectSlug: string, id: string, input: UpdateTaskInput): Task | null;
  delete(projectSlug: string, id: string): boolean;
}

export interface ITagService {
  findAll(limit?: number, offset?: number): Paginated<Tag>;
  findByName(name: string): Tag | null;
  findByPrefix(prefix: string, limit?: number, offset?: number): Paginated<Tag>;
  create(name: string): Tag;
  delete(id: string): boolean;
  addTagToTask(taskId: string, tagName: string): Tag;
  removeTagFromTask(taskId: string, tagId: string): boolean;
  getTagsForTask(taskId: string): Tag[];
  findTasksByTag(tagName: string, limit?: number, offset?: number): Paginated<Task>;
  findTasksByTagPrefix(prefix: string, limit?: number, offset?: number): Paginated<Task>;
}
