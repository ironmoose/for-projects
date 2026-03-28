import type { Workflow } from "../entities";
import type { CreateWorkflowInput, UpdateWorkflowInput } from "../inputs";
import type { IWorkflowService, Paginated, WorkflowFilter } from "../services";
import { ServiceError } from "../errors";
import type { WorkflowRepository } from "../repositories/workflows";
import { WORKFLOW_STATUSES } from "../enums";
import type { EventBus } from "../events";

export class WorkflowService implements IWorkflowService {
  constructor(private repo: WorkflowRepository, private eventBus?: EventBus) {}

  findAll(limit = 50, offset = 0, filter?: WorkflowFilter): Paginated<Workflow> {
    const status = filter?.status;
    if (status && !(WORKFLOW_STATUSES as readonly string[]).includes(status)) {
      throw new ServiceError(`status must be one of: ${WORKFLOW_STATUSES.join(", ")}`, 400);
    }
    return {
      data: this.repo.findAll(limit, offset, status),
      total: this.repo.count(status),
    };
  }

  findById(id: string): Workflow | null {
    return this.repo.findById(id);
  }

  create(input: CreateWorkflowInput): Workflow {
    if (!input.goal?.trim()) {
      throw new ServiceError("goal is required", 400);
    }
    if (input.goal.length > 2000) {
      throw new ServiceError("goal must be 2000 characters or fewer", 400);
    }
    if (input.status !== undefined && !(WORKFLOW_STATUSES as readonly string[]).includes(input.status)) {
      throw new ServiceError(`status must be one of: ${WORKFLOW_STATUSES.join(", ")}`, 400);
    }
    const workflow = this.repo.create(input);
    this.eventBus?.emit({ entity: "workflow", action: "created", payload: workflow });
    return workflow;
  }

  update(id: string, input: UpdateWorkflowInput): Workflow | null {
    if (input.goal !== undefined && !input.goal.trim()) {
      throw new ServiceError("goal cannot be empty", 400);
    }
    if (input.goal !== undefined && input.goal.length > 2000) {
      throw new ServiceError("goal must be 2000 characters or fewer", 400);
    }
    if (input.status !== undefined && !(WORKFLOW_STATUSES as readonly string[]).includes(input.status)) {
      throw new ServiceError(`status must be one of: ${WORKFLOW_STATUSES.join(", ")}`, 400);
    }
    const workflow = this.repo.update(id, input);
    if (workflow) {
      this.eventBus?.emit({ entity: "workflow", action: "updated", payload: workflow });
    }
    return workflow;
  }

  delete(id: string): boolean {
    const existing = this.repo.findById(id);
    const deleted = this.repo.delete(id);
    if (deleted && existing) {
      this.eventBus?.emit({ entity: "workflow", action: "deleted", payload: { id: existing.id } });
    }
    return deleted;
  }
}
