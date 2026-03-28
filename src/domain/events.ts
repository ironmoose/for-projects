import type { Project, Task, Template, Action } from "./entities";

export type DomainEvent =
  | { entity: "project"; action: "created" | "updated"; payload: Project }
  | { entity: "task"; action: "created" | "updated"; payload: Task }
  | { entity: "template"; action: "created" | "updated" | "deleted"; payload: Template | { id: string } }
  | { entity: "action"; action: "created" | "updated" | "deleted"; payload: Action[] | { id: string }[] };

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
