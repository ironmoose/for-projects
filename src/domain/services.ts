import type { Project, Task, Tag, Workflow, Phase, Instruction, InstructionBinding } from "./entities";
import type { ProjectStatus, TaskStatus, TaskType, TaskEffort, WorkflowStatus } from "./enums";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  CreatePhaseInput,
  UpdatePhaseInput,
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

export interface WorkflowFilter {
  status?: WorkflowStatus;
}

export interface IWorkflowService {
  findAll(limit?: number, offset?: number, filter?: WorkflowFilter): Paginated<Workflow>;
  findById(id: string): Workflow | null;
  create(input: CreateWorkflowInput): Workflow;
  update(id: string, input: UpdateWorkflowInput): Workflow | null;
  delete(id: string): boolean;
}

export interface IPhaseService {
  findByWorkflow(workflowId: string, limit?: number, offset?: number): Paginated<Phase>;
  findById(workflowId: string, phaseId: string): Phase | null;
  findByIdDirect(phaseId: string): Phase | null;
  create(workflowId: string, input: CreatePhaseInput): Phase;
  update(workflowId: string, phaseId: string, input: UpdatePhaseInput): Phase | null;
  delete(workflowId: string, phaseId: string): boolean;
  reorder(workflowId: string, phaseIds: string[]): Phase[];
}

export interface IInstructionService {
  findByPhase(phaseId: string, limit?: number, offset?: number): Paginated<Instruction>;
  findById(phaseId: string, instructionId: string): Instruction | null;
  findByIdDirect(instructionId: string): Instruction | null;
  create(phaseId: string, input: CreateInstructionInput): Instruction;
  update(phaseId: string, instructionId: string, input: UpdateInstructionInput): Instruction | null;
  delete(phaseId: string, instructionId: string): boolean;
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
