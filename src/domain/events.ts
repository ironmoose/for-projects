import type { Project, Task, Workbench, Instruction, InstructionBinding } from "./entities";

export type DomainEvent =
  | { entity: "project"; action: "created" | "updated" | "deleted"; payload: Project | { id: string } }
  | { entity: "task"; action: "created" | "updated" | "deleted"; payload: Task | { id: string } }
  | { entity: "workbench"; action: "created" | "updated" | "deleted"; payload: Workbench | { id: string } }
  | { entity: "instruction"; action: "created" | "updated" | "deleted" | "reordered"; payload: Instruction | Instruction[] | { id: string } }
  | { entity: "instruction_binding"; action: "created" | "deleted"; payload: InstructionBinding | { id: string } };

type Listener = (event: DomainEvent) => void;

export class EventBus {
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event: DomainEvent): void {
    for (const fn of this.listeners) {
      try {
        fn(event);
      } catch {
        // listener errors must not break the emitter
      }
    }
  }
}
