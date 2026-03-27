import type { Project, Task, Workbench, Instruction, InstructionBinding } from "./entities";

export type CreateProjectInput = Pick<Project, "name"> &
  Partial<Pick<Project, "description" | "status">>;

export type UpdateProjectInput = Partial<
  Pick<Project, "name" | "description" | "status">
>;

export type CreateTaskInput = Pick<Task, "title"> &
  Partial<Pick<Task, "description" | "status" | "type" | "effort" | "priority">>;

export type UpdateTaskInput = Partial<Pick<Task, "title" | "description" | "status" | "type" | "effort" | "priority">>;

export type CreateWorkbenchInput = Pick<Workbench, "goal"> &
  Partial<Pick<Workbench, "cursor" | "status">>;

export type UpdateWorkbenchInput = Partial<Pick<Workbench, "goal" | "cursor" | "status">>;

export type CreateInstructionInput = Pick<Instruction, "prompt"> &
  Partial<Pick<Instruction, "position" | "agent" | "parallel" | "actor" | "status">>;

export type UpdateInstructionInput = Partial<Pick<Instruction, "prompt" | "output" | "agent" | "parallel" | "actor" | "status">>;

export type CreateInstructionBindingInput = Pick<InstructionBinding, "arn" | "kind">;
