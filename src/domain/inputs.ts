import type { Project, Task } from "./entities";

export type CreateProjectInput = Pick<Project, "name" | "slug"> &
  Partial<Pick<Project, "description" | "status">>;

export type UpdateProjectInput = Partial<
  Pick<Project, "name" | "description" | "status">
>;

export type CreateTaskInput = Pick<Task, "title"> &
  Partial<Pick<Task, "description" | "status" | "priority">>;

export type UpdateTaskInput = Partial<Pick<Task, "title" | "description" | "status" | "priority">>;
