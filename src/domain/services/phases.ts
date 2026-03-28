import type { Phase } from "../entities";
import type { CreatePhaseInput, UpdatePhaseInput } from "../inputs";
import type { IPhaseService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { PhaseRepository } from "../repositories/phases";
import type { WorkflowRepository } from "../repositories/workflows";
import type { EventBus } from "../events";

export class PhaseService implements IPhaseService {
  constructor(
    private repo: PhaseRepository,
    private workflowRepo: WorkflowRepository,
    private eventBus?: EventBus,
  ) {}

  private requireWorkflow(workflowId: string): void {
    if (!this.workflowRepo.findById(workflowId)) {
      throw new ServiceError("workflow not found", 404);
    }
  }

  findByWorkflow(workflowId: string, limit = 50, offset = 0): Paginated<Phase> {
    this.requireWorkflow(workflowId);
    return {
      data: this.repo.findByWorkflowPaginated(workflowId, limit, offset),
      total: this.repo.countByWorkflow(workflowId),
    };
  }

  findById(workflowId: string, phaseId: string): Phase | null {
    this.requireWorkflow(workflowId);
    const phase = this.repo.findById(phaseId);
    if (phase && phase.workflow_id !== workflowId) return null;
    return phase;
  }

  findByIdDirect(phaseId: string): Phase | null {
    return this.repo.findById(phaseId);
  }

  create(workflowId: string, input: CreatePhaseInput): Phase {
    this.requireWorkflow(workflowId);

    if (!input.title?.trim()) {
      throw new ServiceError("title is required", 400);
    }
    if (input.title.length > 500) {
      throw new ServiceError("title must be 500 characters or fewer", 400);
    }

    let position: number;
    if (input.position !== undefined) {
      if (!Number.isInteger(input.position) || input.position < 0) {
        throw new ServiceError("position must be a non-negative integer", 400);
      }
      position = input.position;
    } else {
      position = this.repo.nextPosition(workflowId);
    }

    const phase = this.repo.create(workflowId, input, position);
    this.eventBus?.emit({ entity: "phase", action: "created", payload: phase });
    return phase;
  }

  update(workflowId: string, phaseId: string, input: UpdatePhaseInput): Phase | null {
    this.requireWorkflow(workflowId);

    const existing = this.repo.findById(phaseId);
    if (!existing || existing.workflow_id !== workflowId) return null;

    if (input.title !== undefined && !input.title.trim()) {
      throw new ServiceError("title cannot be empty", 400);
    }
    if (input.title !== undefined && input.title.length > 500) {
      throw new ServiceError("title must be 500 characters or fewer", 400);
    }

    if (input.title === undefined) {
      return existing;
    }

    const phase = this.repo.update(phaseId, input);
    if (phase) {
      this.eventBus?.emit({ entity: "phase", action: "updated", payload: phase });
    }
    return phase;
  }

  delete(workflowId: string, phaseId: string): boolean {
    this.requireWorkflow(workflowId);

    const existing = this.repo.findById(phaseId);
    if (!existing || existing.workflow_id !== workflowId) return false;

    const deleted = this.repo.delete(phaseId);
    if (deleted) {
      this.eventBus?.emit({ entity: "phase", action: "deleted", payload: { id: phaseId } });
    }
    return deleted;
  }

  reorder(workflowId: string, phaseIds: string[]): Phase[] {
    this.requireWorkflow(workflowId);

    const existing = this.repo.findAllByWorkflow(workflowId);
    const existingIds = new Set(existing.map((p) => p.id));

    if (phaseIds.length !== existing.length) {
      throw new ServiceError(`expected ${existing.length} phase IDs, got ${phaseIds.length}`, 400);
    }

    const seen = new Set<string>();
    for (const id of phaseIds) {
      if (!existingIds.has(id)) {
        throw new ServiceError(`phase ${id} not found in workflow`, 400);
      }
      if (seen.has(id)) {
        throw new ServiceError(`duplicate phase ID: ${id}`, 400);
      }
      seen.add(id);
    }

    this.repo.reorder(workflowId, phaseIds);

    const reordered = this.repo.findAllByWorkflow(workflowId);
    this.eventBus?.emit({ entity: "phase", action: "reordered", payload: reordered });
    return reordered;
  }
}
