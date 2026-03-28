import type { Project, Task, Action } from "./entities";

export type DomainEvent =
  | { entity: "project"; action: "created" | "updated"; payload: Project }
  | { entity: "task"; action: "created" | "updated"; payload: Task }
  | { entity: "action"; action: "created" | "updated" | "deleted" | "status_changed"; payload: Action[] | { id: string }[] }
  | { entity: "action"; action: "tier_complete"; payload: { target: string; rank: number } };

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
