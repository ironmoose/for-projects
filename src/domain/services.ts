import type { Project, Task, Tag, Workbench, Instruction, InstructionBinding } from "./entities";
import type { ProjectStatus, TaskStatus, TaskType, TaskEffort, InstructionStatus, WorkbenchStatus } from "./enums";
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
  findById(id: string): Project | null;
  create(input: CreateProjectInput): Project;
  update(id: string, input: UpdateProjectInput): Project | null;
  delete(id: string): boolean;
}

export interface ITaskService {
  findById(id: string): Task | null;
  findByProjectId(projectId: string, limit?: number, offset?: number, filter?: TaskFilter): Paginated<Task>;
  findByNumber(projectId: string, number: number): Task | null;
  create(projectId: string, input: CreateTaskInput): Task;
  update(projectId: string, id: string, input: UpdateTaskInput): Task | null;
  delete(projectId: string, id: string): boolean;
}

export interface WorkbenchFilter {
  status?: WorkbenchStatus;
}

export interface IWorkbenchService {
  findAll(limit?: number, offset?: number, filter?: WorkbenchFilter): Paginated<Workbench>;
  findById(id: string): Workbench | null;
  create(input: CreateWorkbenchInput): Workbench;
  update(id: string, input: UpdateWorkbenchInput): Workbench | null;
  delete(id: string): boolean;
}

export interface InstructionFilter {
  status?: InstructionStatus;
}

export interface IInstructionService {
  findByWorkbench(workbenchId: string, limit?: number, offset?: number, filter?: InstructionFilter): Paginated<Instruction>;
  findById(workbenchId: string, instructionId: string): Instruction | null;
  findByIdDirect(instructionId: string): Instruction | null;
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
  removeTagFromTaskByName(taskId: string, tagName: string): boolean;
  getTagsForTask(taskId: string): Tag[];
  findTasksByTag(tagName: string, limit?: number, offset?: number): Paginated<Task>;
  findTasksByTagPrefix(prefix: string, limit?: number, offset?: number): Paginated<Task>;
}
