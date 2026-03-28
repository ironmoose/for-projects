import type { Project, Task, Workflow, Phase, Instruction, Binding } from "./entities";

export type DomainEvent =
  | { entity: "project"; action: "created" | "updated" | "deleted"; payload: Project | { id: string } }
  | { entity: "task"; action: "created" | "updated" | "deleted"; payload: Task | { id: string } }
  | { entity: "workflow"; action: "created" | "updated" | "deleted"; payload: Workflow | { id: string } }
  | { entity: "phase"; action: "created" | "updated" | "deleted" | "reordered"; payload: Phase | Phase[] | { id: string } }
  | { entity: "instruction"; action: "created" | "updated" | "deleted"; payload: Instruction | { id: string } }
  | { entity: "binding"; action: "created" | "deleted"; payload: Binding | { id: string } };

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
