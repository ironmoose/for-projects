import type { Project, Task, Action, EntityAction } from "./entities";

export type DomainEvent =
  | { entity: "project"; action: "created" | "updated"; payload: Project }
  | { entity: "task"; action: "created" | "updated"; payload: Task }
  | { entity: "action"; action: "created" | "updated"; payload: Action }
  | { entity: "entity_action"; action: "linked" | "unlinked" | "status_changed" | "updated"; payload: EntityAction | { entity_type: string; entity_id: string; role: string } };

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
