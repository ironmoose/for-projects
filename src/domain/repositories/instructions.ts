import type { Database } from "bun:sqlite";
import { ulid } from "ulid";
import type { Instruction, InstructionBinding } from "../entities";
import type { CreateInstructionInput, UpdateInstructionInput, CreateInstructionBindingInput } from "../inputs";

/** SQLite stores booleans as integers; coerce `parallel` back to a JS boolean. */
function mapInstruction(row: Record<string, unknown>): Instruction {
  return { ...row, parallel: Boolean(row.parallel) } as Instruction;
}

export class InstructionRepository {
  constructor(private db: Database) {}

  findById(id: string): Instruction | null {
    const row = this.db.query("SELECT * FROM instructions WHERE id = ?").get(id) as Record<string, unknown> | null;
    return row ? mapInstruction(row) : null;
  }

  /** Fetches all instructions for a workbench (unbounded). Used by reorder validation. */
  findAllByWorkbench(workbenchId: string): Instruction[] {
    const rows = this.db
      .query("SELECT * FROM instructions WHERE workbench_id = ? ORDER BY position ASC")
      .all(workbenchId) as Record<string, unknown>[];
    return rows.map(mapInstruction);
  }

  findByWorkbenchPaginated(workbenchId: string, limit: number, offset: number, status?: string): Instruction[] {
    if (status) {
      const rows = this.db
        .query("SELECT * FROM instructions WHERE workbench_id = ? AND status = ? ORDER BY position ASC LIMIT ? OFFSET ?")
        .all(workbenchId, status, limit, offset) as Record<string, unknown>[];
      return rows.map(mapInstruction);
    }
    const rows = this.db
      .query("SELECT * FROM instructions WHERE workbench_id = ? ORDER BY position ASC LIMIT ? OFFSET ?")
      .all(workbenchId, limit, offset) as Record<string, unknown>[];
    return rows.map(mapInstruction);
  }

  countByWorkbench(workbenchId: string, status?: string): number {
    if (status) {
      return (
        this.db
          .query("SELECT COUNT(*) as total FROM instructions WHERE workbench_id = ? AND status = ?")
          .get(workbenchId, status) as { total: number }
      ).total;
    }
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
    const agent = input.agent ?? null;
    const parallel = input.parallel ? 1 : 0;
    const actor = input.actor ?? "agent";
    const status = input.status ?? "pending";

    this.db
      .query(
        `INSERT INTO instructions (id, workbench_id, prompt, position, agent, parallel, actor, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, workbenchId, input.prompt, position, agent, parallel, actor, status, now, now);

    return this.findById(id)!;
  }

  update(id: string, input: UpdateInstructionInput): Instruction | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const prompt = input.prompt ?? existing.prompt;
    const output = input.output !== undefined ? input.output : existing.output;
    const agent = input.agent !== undefined ? input.agent : existing.agent;
    const parallel = input.parallel !== undefined ? (input.parallel ? 1 : 0) : (existing.parallel ? 1 : 0);
    const actor = input.actor ?? existing.actor;
    const status = input.status ?? existing.status;
    const now = new Date().toISOString();

    this.db
      .query("UPDATE instructions SET prompt = ?, output = ?, agent = ?, parallel = ?, actor = ?, status = ?, updated_at = ? WHERE id = ?")
      .run(prompt, output, agent, parallel, actor, status, now, id);

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const result = this.db.query("DELETE FROM instructions WHERE id = ?").run(id);
    return result.changes > 0;
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
