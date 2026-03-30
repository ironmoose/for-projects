export type DomainEvent =
  | { type: 'created'; entity_type: string; payload: unknown }
  | { type: 'updated'; entity_type: string; payload: unknown }
  | { type: 'deleted'; entity_type: string; ids: string[] };

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
