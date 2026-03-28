import type { Project, Task, Workflow, Phase, Instruction, Binding } from "./entities";

export type CreateProjectInput = Pick<Project, "name"> &
  Partial<Pick<Project, "description" | "status">>;

export type UpdateProjectInput = Partial<
  Pick<Project, "name" | "description" | "status">
>;

export type CreateTaskInput = Pick<Task, "title"> &
  Partial<Pick<Task, "description" | "status" | "type" | "effort" | "priority">>;

export type UpdateTaskInput = Partial<Pick<Task, "title" | "description" | "status" | "type" | "effort" | "priority">>;

export type CreateWorkflowInput = Pick<Workflow, "goal"> &
  Partial<Pick<Workflow, "cursor" | "status">>;

export type UpdateWorkflowInput = Partial<Pick<Workflow, "goal" | "cursor" | "status">>;

export type CreatePhaseInput = Pick<Phase, "title"> &
  Partial<Pick<Phase, "position">>;

export type UpdatePhaseInput = Partial<Pick<Phase, "title">>;

export type CreateInstructionInput = Pick<Instruction, "prompt"> &
  Partial<Pick<Instruction, "agent">>;

export type UpdateInstructionInput = Partial<Pick<Instruction, "prompt" | "output" | "agent">>;

export type CreateBindingInput = Pick<Binding, "arn">;
