import type { Project, Task, Tag, Workbench, Instruction, InstructionBinding } from "./entities";
import type { ProjectStatus, TaskStatus, TaskType, TaskEffort } from "./statuses";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateWorkbenchInput,
  UpdateWorkbenchInput,
  CreateInstructionInput,
  UpdateInstructionInput,
  CreateInstructionBindingInput,
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

export interface IWorkbenchService {
  findAll(limit?: number, offset?: number): Paginated<Workbench>;
  findById(id: string): Workbench | null;
  create(input: CreateWorkbenchInput): Workbench;
  update(id: string, input: UpdateWorkbenchInput): Workbench | null;
  delete(id: string): boolean;
}

export interface IInstructionService {
  findByWorkbench(workbenchId: string, limit?: number, offset?: number): Paginated<Instruction>;
  findById(workbenchId: string, instructionId: string): Instruction | null;
  create(workbenchId: string, input: CreateInstructionInput): Instruction;
  update(workbenchId: string, instructionId: string, input: UpdateInstructionInput): Instruction | null;
  delete(workbenchId: string, instructionId: string): boolean;
  reorder(workbenchId: string, instructionIds: string[]): Instruction[];
}

export interface IInstructionBindingService {
  findByInstruction(instructionId: string): InstructionBinding[];
  findByArn(arn: string): InstructionBinding[];
  create(instructionId: string, input: CreateInstructionBindingInput): InstructionBinding;
  delete(instructionId: string, bindingId: string): boolean;
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
