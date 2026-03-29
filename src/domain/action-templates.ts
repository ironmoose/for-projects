import type { ActionRole, EntityType } from "./entities";

export interface ActionTemplate {
  role: ActionRole;
  name: string;
  prompt: string;
  agent: string;
}

export const PROJECT_ACTION_TEMPLATES: ActionTemplate[] = [
  {
    role: "goal",
    name: "Goal Analysis",
    prompt: "Analyze the project objectives and define clear, measurable goals. Identify key success criteria, target outcomes, and any constraints that shape the project direction.",
    agent: "research",
  },
  {
    role: "design",
    name: "High-Level Design",
    prompt: "Produce a high-level design for the project. Outline the major components, their responsibilities, and how they interact. Capture important trade-offs and decisions.",
    agent: "design",
  },
  {
    role: "requirements",
    name: "Requirements Analysis",
    prompt: "Research and enumerate the functional and non-functional requirements for the project. Prioritize them and flag any open questions or risks that need resolution.",
    agent: "research",
  },
];

export const TASK_ACTION_TEMPLATES: ActionTemplate[] = [
  {
    role: "implementation",
    name: "Implementation",
    prompt: "Implement the task according to its summary and context. Follow established conventions, write clean code, and ensure the change is complete and self-contained.",
    agent: "implementation",
  },
  {
    role: "validation",
    name: "Validation",
    prompt: "Review the task implementation for correctness, edge cases, and adherence to project standards. Verify that tests pass and the acceptance criteria are met.",
    agent: "review",
  },
];

export function getTemplatesForEntityType(entityType: EntityType): ActionTemplate[] {
  switch (entityType) {
    case "project":
      return PROJECT_ACTION_TEMPLATES;
    case "task":
      return TASK_ACTION_TEMPLATES;
  }
}
