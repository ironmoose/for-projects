import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Instruction, InstructionBinding } from "../entities";
import type { CreateInstructionInput, UpdateInstructionInput, CreateInstructionBindingInput } from "../inputs";

export class InstructionRepository {
  constructor(private db: Database) {}

  findById(id: string): Instruction | null {
    return this.db.query("SELECT * FROM instructions WHERE id = ?").get(id) as Instruction | null;
  }

  findByWorkbench(workbenchId: string): Instruction[] {
    return this.db
      .query("SELECT * FROM instructions WHERE workbench_id = ? ORDER BY position ASC")
      .all(workbenchId) as Instruction[];
  }

  countByWorkbench(workbenchId: string): number {
    return (
      this.db
        .query("SELECT COUNT(*) as total FROM instructions WHERE workbench_id = ?")
        .get(workbenchId) as { total: number }
    ).total;
  }

  nextPosition(workbenchId: string): number {
    const row = this.db
      .query("SELECT COALESCE(MAX(position), -1) + 1 as next FROM instructions WHERE workbench_id = ?")
      .get(workbenchId) as { next: number };
    return row.next;
  }

  create(workbenchId: string, input: CreateInstructionInput, position: number): Instruction {
    const id = ulid();
    const now = new Date().toISOString();

    this.db
      .query(
        `INSERT INTO instructions (id, workbench_id, prompt, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, workbenchId, input.prompt, position, now, now);

    return this.findById(id)!;
  }

  update(id: string, input: UpdateInstructionInput): Instruction | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const prompt = input.prompt ?? existing.prompt;
    const output = input.output !== undefined ? input.output : existing.output;
    const now = new Date().toISOString();

    this.db
      .query("UPDATE instructions SET prompt = ?, output = ?, updated_at = ? WHERE id = ?")
      .run(prompt, output, now, id);

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.query("DELETE FROM instructions WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /** Shift positions down to close a gap after deletion */
  closeGap(workbenchId: string, removedPosition: number): void {
    this.db
      .query("UPDATE instructions SET position = position - 1 WHERE workbench_id = ? AND position > ?")
      .run(workbenchId, removedPosition);
  }

  /** Shift positions up to make room for insertion at a specific position. */
  shiftUp(workbenchId: string, fromPosition: number): void {
    this.db
      .query("UPDATE instructions SET position = -(position + 1) WHERE workbench_id = ? AND position >= ?")
      .run(workbenchId, fromPosition);
    this.db
      .query("UPDATE instructions SET position = (-position) WHERE workbench_id = ? AND position < 0")
      .run(workbenchId);
  }

  /** Reorder instructions within a workbench. */
  reorder(workbenchId: string, orderedIds: string[]): void {
    this.db.transaction(() => {
      for (let i = 0; i < orderedIds.length; i++) {
        this.db
          .query("UPDATE instructions SET position = ? WHERE id = ? AND workbench_id = ?")
          .run(-(i + 1), orderedIds[i], workbenchId);
      }
      const now = new Date().toISOString();
      for (let i = 0; i < orderedIds.length; i++) {
        this.db
          .query("UPDATE instructions SET position = ?, updated_at = ? WHERE id = ? AND workbench_id = ?")
          .run(i, now, orderedIds[i], workbenchId);
      }
    })();
  }
}

export class InstructionBindingRepository {
  constructor(private db: Database) {}

  findById(id: string): InstructionBinding | null {
    return this.db.query("SELECT * FROM instruction_bindings WHERE id = ?").get(id) as InstructionBinding | null;
  }

  findByInstruction(instructionId: string): InstructionBinding[] {
    return this.db
      .query("SELECT * FROM instruction_bindings WHERE instruction_id = ? ORDER BY created_at ASC")
      .all(instructionId) as InstructionBinding[];
  }

  findByArn(arn: string): InstructionBinding[] {
    return this.db
      .query("SELECT * FROM instruction_bindings WHERE arn = ? ORDER BY created_at ASC")
      .all(arn) as InstructionBinding[];
  }

  countByInstruction(instructionId: string): number {
    return (
      this.db
        .query("SELECT COUNT(*) as total FROM instruction_bindings WHERE instruction_id = ?")
        .get(instructionId) as { total: number }
    ).total;
  }

  create(instructionId: string, input: CreateInstructionBindingInput): InstructionBinding {
    const id = ulid();
    const now = new Date().toISOString();

    this.db
      .query(
        `INSERT INTO instruction_bindings (id, instruction_id, arn, kind, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, instructionId, input.arn, input.kind, now, now);

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.query("DELETE FROM instruction_bindings WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
