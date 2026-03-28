import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Instruction, Binding } from "../entities";
import type { CreateInstructionInput, UpdateInstructionInput, CreateBindingInput } from "../inputs";

export class InstructionRepository {
  constructor(private db: Database) {}

  findById(id: string): Instruction | null {
    return this.db.query("SELECT * FROM instructions WHERE id = ?").get(id) as Instruction | null;
  }

  findByPhase(phaseId: string): Instruction[] {
    return this.db
      .query("SELECT * FROM instructions WHERE phase_id = ? ORDER BY created_at ASC")
      .all(phaseId) as Instruction[];
  }

  findByPhasePaginated(phaseId: string, limit: number, offset: number): Instruction[] {
    return this.db
      .query("SELECT * FROM instructions WHERE phase_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?")
      .all(phaseId, limit, offset) as Instruction[];
  }

  countByPhase(phaseId: string): number {
    return (
      this.db
        .query("SELECT COUNT(*) as total FROM instructions WHERE phase_id = ?")
        .get(phaseId) as { total: number }
    ).total;
  }

  create(phaseId: string, input: CreateInstructionInput): Instruction {
    const id = ulid();
    const now = new Date().toISOString();
    const agent = input.agent ?? null;

    this.db
      .query(
        `INSERT INTO instructions (id, phase_id, prompt, agent, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, phaseId, input.prompt, agent, now, now);

    return this.findById(id)!;
  }

  update(id: string, input: UpdateInstructionInput): Instruction | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const prompt = input.prompt ?? existing.prompt;
    const output = input.output !== undefined ? input.output : existing.output;
    const agent = input.agent !== undefined ? input.agent : existing.agent;
    const now = new Date().toISOString();

    this.db
      .query("UPDATE instructions SET prompt = ?, output = ?, agent = ?, updated_at = ? WHERE id = ?")
      .run(prompt, output, agent, now, id);

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.query("DELETE FROM instructions WHERE id = ?").run(id);
    return result.changes > 0;
  }
}

export class BindingRepository {
  constructor(private db: Database) {}

  findById(id: string): Binding | null {
    return this.db.query("SELECT * FROM bindings WHERE id = ?").get(id) as Binding | null;
  }

  findByInstruction(instructionId: string): Binding[] {
    return this.db
      .query("SELECT * FROM bindings WHERE instruction_id = ? ORDER BY created_at ASC")
      .all(instructionId) as Binding[];
  }

  findByArn(arn: string): Binding[] {
    return this.db
      .query("SELECT * FROM bindings WHERE arn = ? ORDER BY created_at ASC")
      .all(arn) as Binding[];
  }

  countByInstruction(instructionId: string): number {
    return (
      this.db
        .query("SELECT COUNT(*) as total FROM bindings WHERE instruction_id = ?")
        .get(instructionId) as { total: number }
    ).total;
  }

  create(instructionId: string, input: CreateBindingInput): Binding {
    const id = ulid();
    const now = new Date().toISOString();

    this.db
      .query(
        `INSERT INTO bindings (id, instruction_id, arn, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, instructionId, input.arn, now, now);

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.query("DELETE FROM bindings WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
