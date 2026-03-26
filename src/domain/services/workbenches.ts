import type { Workbench } from "../entities";
import type { CreateWorkbenchInput, UpdateWorkbenchInput } from "../inputs";
import type { IWorkbenchService, Paginated, WorkbenchFilter } from "../services";
import { ServiceError } from "../errors";
import type { WorkbenchRepository } from "../repositories/workbenches";
import { WORKBENCH_STATUSES } from "../enums";
import type { EventBus } from "../events";

export class WorkbenchService implements IWorkbenchService {
  constructor(private repo: WorkbenchRepository, private eventBus?: EventBus) {}

  findAll(limit = 50, offset = 0, filter?: WorkbenchFilter): Paginated<Workbench> {
    const status = filter?.status;
    if (status && !(WORKBENCH_STATUSES as readonly string[]).includes(status)) {
      throw new ServiceError(`status must be one of: ${WORKBENCH_STATUSES.join(", ")}`, 400);
    }
    return {
      data: this.repo.findAll(limit, offset, status),
      total: this.repo.count(status),
    };
  }

  findById(id: string): Workbench | null {
    return this.repo.findById(id);
  }

  create(input: CreateWorkbenchInput): Workbench {
    if (!input.goal?.trim()) {
      throw new ServiceError("goal is required", 400);
    }
    if (input.goal.length > 2000) {
      throw new ServiceError("goal must be 2000 characters or fewer", 400);
    }
    if (input.status !== undefined && !(WORKBENCH_STATUSES as readonly string[]).includes(input.status)) {
      throw new ServiceError(`status must be one of: ${WORKBENCH_STATUSES.join(", ")}`, 400);
    }
    const workbench = this.repo.create(input);
    this.eventBus?.emit({ entity: "workbench", action: "created", payload: workbench });
    return workbench;
  }

  update(id: string, input: UpdateWorkbenchInput): Workbench | null {
    if (input.goal !== undefined && !input.goal.trim()) {
      throw new ServiceError("goal cannot be empty", 400);
    }
    if (input.goal !== undefined && input.goal.length > 2000) {
      throw new ServiceError("goal must be 2000 characters or fewer", 400);
    }
    if (input.status !== undefined && !(WORKBENCH_STATUSES as readonly string[]).includes(input.status)) {
      throw new ServiceError(`status must be one of: ${WORKBENCH_STATUSES.join(", ")}`, 400);
    }
    const workbench = this.repo.update(id, input);
    if (workbench) {
      this.eventBus?.emit({ entity: "workbench", action: "updated", payload: workbench });
    }
    return workbench;
  }

  delete(id: string): boolean {
    const existing = this.repo.findById(id);
    const deleted = this.repo.delete(id);
    if (deleted && existing) {
      this.eventBus?.emit({ entity: "workbench", action: "deleted", payload: { id: existing.id } });
    }
    return deleted;
  }
}
