import type { Instruction, InstructionBinding } from "../entities";
import type {
  CreateInstructionInput,
  UpdateInstructionInput,
  CreateInstructionBindingInput,
} from "../inputs";
import type { IInstructionService, IInstructionBindingService, Paginated } from "../services";
import { ServiceError } from "../errors";
import type { InstructionRepository, InstructionBindingRepository } from "../repositories/instructions";
import type { PhaseRepository } from "../repositories/phases";
import type { EventBus } from "../events";
import { type ArnResolverMap, validateArn, ArnError } from "../arn";

export class InstructionService implements IInstructionService {
  constructor(
    private repo: InstructionRepository,
    private phaseRepo: PhaseRepository,
    private eventBus?: EventBus,
  ) {}

  private requirePhase(phaseId: string): void {
    if (!this.phaseRepo.findById(phaseId)) {
      throw new ServiceError("phase not found", 404);
    }
  }

  findByPhase(phaseId: string, limit = 50, offset = 0): Paginated<Instruction> {
    this.requirePhase(phaseId);
    return {
      data: this.repo.findByPhasePaginated(phaseId, limit, offset),
      total: this.repo.countByPhase(phaseId),
    };
  }

  findById(phaseId: string, instructionId: string): Instruction | null {
    this.requirePhase(phaseId);
    const instruction = this.repo.findById(instructionId);
    if (instruction && instruction.phase_id !== phaseId) return null;
    return instruction;
  }

  findByIdDirect(instructionId: string): Instruction | null {
    return this.repo.findById(instructionId);
  }

  create(phaseId: string, input: CreateInstructionInput): Instruction {
    this.requirePhase(phaseId);

    if (!input.prompt?.trim()) {
      throw new ServiceError("prompt is required", 400);
    }

    const instruction = this.repo.create(phaseId, input);
    this.eventBus?.emit({ entity: "instruction", action: "created", payload: instruction });
    return instruction;
  }

  update(phaseId: string, instructionId: string, input: UpdateInstructionInput): Instruction | null {
    this.requirePhase(phaseId);

    const existing = this.repo.findById(instructionId);
    if (!existing || existing.phase_id !== phaseId) return null;

    if (input.prompt !== undefined && !input.prompt.trim()) {
      throw new ServiceError("prompt cannot be empty", 400);
    }

    if (
      input.prompt === undefined &&
      input.output === undefined &&
      input.agent === undefined
    ) {
      return existing;
    }

    const instruction = this.repo.update(instructionId, input);
    if (instruction) {
      this.eventBus?.emit({ entity: "instruction", action: "updated", payload: instruction });
    }
    return instruction;
  }

  delete(phaseId: string, instructionId: string): boolean {
    this.requirePhase(phaseId);

    const existing = this.repo.findById(instructionId);
    if (!existing || existing.phase_id !== phaseId) return false;

    const deleted = this.repo.delete(instructionId);
    if (deleted) {
      this.eventBus?.emit({ entity: "instruction", action: "deleted", payload: { id: instructionId } });
    }
    return deleted;
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
