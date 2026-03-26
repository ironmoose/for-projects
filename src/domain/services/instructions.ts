import type { Instruction, InstructionBinding } from "../entities";
import type {
  CreateInstructionInput,
  UpdateInstructionInput,
  CreateInstructionBindingInput,
} from "../inputs";
import type { IInstructionService, IInstructionBindingService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { InstructionRepository, InstructionBindingRepository } from "../repositories/instructions";
import type { WorkbenchRepository } from "../repositories/workbenches";
import { BINDING_KINDS } from "../statuses";
import type { EventBus } from "../events";
import { type ArnResolverMap, validateArn, ArnError } from "../arn";

export class InstructionService implements IInstructionService {
  constructor(
    private repo: InstructionRepository,
    private workbenchRepo: WorkbenchRepository,
    private eventBus?: EventBus,
  ) {}

  private requireWorkbench(workbenchId: string): void {
    if (!this.workbenchRepo.findById(workbenchId)) {
      throw new ServiceError("workbench not found", 404);
    }
  }

  findByWorkbench(workbenchId: string, limit = 50, offset = 0): Paginated<Instruction> {
    this.requireWorkbench(workbenchId);
    return {
      data: this.repo.findByWorkbenchPaginated(workbenchId, limit, offset),
      total: this.repo.countByWorkbench(workbenchId),
    };
  }

  findById(workbenchId: string, instructionId: string): Instruction | null {
    this.requireWorkbench(workbenchId);
    const instruction = this.repo.findById(instructionId);
    if (instruction && instruction.workbench_id !== workbenchId) return null;
    return instruction;
  }

  create(workbenchId: string, input: CreateInstructionInput): Instruction {
    this.requireWorkbench(workbenchId);

    if (!input.prompt?.trim()) {
      throw new ServiceError("prompt is required", 400);
    }

    let position: number;
    if (input.position !== undefined) {
      if (!Number.isInteger(input.position) || input.position < 0) {
        throw new ServiceError("position must be a non-negative integer", 400);
      }
      position = input.position;
    } else {
      position = this.repo.nextPosition(workbenchId);
    }

    const instruction = this.repo.create(workbenchId, input, position);
    this.eventBus?.emit({ entity: "instruction", action: "created", payload: instruction });
    return instruction;
  }

  update(workbenchId: string, instructionId: string, input: UpdateInstructionInput): Instruction | null {
    this.requireWorkbench(workbenchId);

    const existing = this.repo.findById(instructionId);
    if (!existing || existing.workbench_id !== workbenchId) return null;

    if (input.prompt !== undefined && !input.prompt.trim()) {
      throw new ServiceError("prompt cannot be empty", 400);
    }

    if (input.prompt === undefined && input.output === undefined) {
      return existing;
    }

    const instruction = this.repo.update(instructionId, input);
    if (instruction) {
      this.eventBus?.emit({ entity: "instruction", action: "updated", payload: instruction });
    }
    return instruction;
  }

  delete(workbenchId: string, instructionId: string): boolean {
    this.requireWorkbench(workbenchId);

    const existing = this.repo.findById(instructionId);
    if (!existing || existing.workbench_id !== workbenchId) return false;

    const deleted = this.repo.delete(instructionId);
    if (deleted) {
      this.eventBus?.emit({ entity: "instruction", action: "deleted", payload: { id: instructionId } });
    }
    return deleted;
  }

  reorder(workbenchId: string, instructionIds: string[]): Instruction[] {
    this.requireWorkbench(workbenchId);

    const existing = this.repo.findAllByWorkbench(workbenchId);
    const existingIds = new Set(existing.map((i) => i.id));

    if (instructionIds.length !== existing.length) {
      throw new ServiceError(`expected ${existing.length} instruction IDs, got ${instructionIds.length}`, 400);
    }

    const seen = new Set<string>();
    for (const id of instructionIds) {
      if (!existingIds.has(id)) {
        throw new ServiceError(`instruction ${id} not found in workbench`, 400);
      }
      if (seen.has(id)) {
        throw new ServiceError(`duplicate instruction ID: ${id}`, 400);
      }
      seen.add(id);
    }

    this.repo.reorder(workbenchId, instructionIds);

    const reordered = this.repo.findAllByWorkbench(workbenchId);
    this.eventBus?.emit({ entity: "instruction", action: "reordered", payload: reordered });
    return reordered;
  }
}

export class InstructionBindingService implements IInstructionBindingService {
  constructor(
    private repo: InstructionBindingRepository,
    private instructionRepo: InstructionRepository,
    private arnResolvers: ArnResolverMap,
    private eventBus?: EventBus,
  ) {}

  private requireInstruction(instructionId: string): Instruction {
    const instruction = this.instructionRepo.findById(instructionId);
    if (!instruction) {
      throw new ServiceError("instruction not found", 404);
    }
    return instruction;
  }

  findByInstruction(instructionId: string): InstructionBinding[] {
    this.requireInstruction(instructionId);
    return this.repo.findByInstruction(instructionId);
  }

  findByArn(arn: string): InstructionBinding[] {
    return this.repo.findByArn(arn);
  }

  create(instructionId: string, input: CreateInstructionBindingInput): InstructionBinding {
    this.requireInstruction(instructionId);

    if (!input.arn?.trim()) {
      throw new ServiceError("arn is required", 400);
    }

    if (!input.kind?.trim()) {
      throw new ServiceError("kind is required", 400);
    }

    if (!(BINDING_KINDS as readonly string[]).includes(input.kind)) {
      throw new ServiceError(`kind must be one of: ${BINDING_KINDS.join(", ")}`, 400);
    }

    try {
      validateArn(input.arn, this.arnResolvers);
    } catch (e: unknown) {
      if (e instanceof ArnError) {
        throw new ServiceError(e.message, 400);
      }
      throw e;
    }

    const binding = this.repo.create(instructionId, input);
    this.eventBus?.emit({ entity: "instruction_binding", action: "created", payload: binding });
    return binding;
  }

  delete(instructionId: string, bindingId: string): boolean {
    this.requireInstruction(instructionId);

    const existing = this.repo.findById(bindingId);
    if (!existing || existing.instruction_id !== instructionId) return false;

    const deleted = this.repo.delete(bindingId);
    if (deleted) {
      this.eventBus?.emit({ entity: "instruction_binding", action: "deleted", payload: { id: bindingId } });
    }
    return deleted;
  }
}
