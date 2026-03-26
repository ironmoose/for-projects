import type { Project, Task, Workbench, Instruction, InstructionBinding } from "./entities";

export type CreateProjectInput = Pick<Project, "name" | "slug"> &
  Partial<Pick<Project, "description" | "status">>;

export type UpdateProjectInput = Partial<
  Pick<Project, "name" | "description" | "status">
>;

export type CreateTaskInput = Pick<Task, "title"> &
  Partial<Pick<Task, "description" | "status" | "type" | "effort" | "priority">>;

export type UpdateTaskInput = Partial<Pick<Task, "title" | "description" | "status" | "type" | "effort" | "priority">>;

export type CreateWorkbenchInput = Pick<Workbench, "goal">;

export type UpdateWorkbenchInput = Partial<Pick<Workbench, "goal">>;

export type CreateInstructionInput = Pick<Instruction, "prompt"> &
  Partial<Pick<Instruction, "position">>;

export type UpdateInstructionInput = Partial<Pick<Instruction, "prompt" | "output">>;

export type CreateInstructionBindingInput = Pick<InstructionBinding, "arn" | "kind">;
