export type DomainEvent = {
  type: 'created' | 'updated' | 'deleted';
  entity_type: string;
  ids: string[];
};

type Listener = (event: DomainEvent) => void;

export class EventBus {
  private listeners = new Set<Listener>();
  private batchQueue: DomainEvent[] | null = null;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  beginBatch(): void {
    if (this.batchQueue !== null) return; // nested batch is a no-op
    this.batchQueue = [];
  }

  flushBatch(): void {
    const queued = this.batchQueue;
    this.batchQueue = null;
    if (!queued || queued.length === 0) return;

    // Coalesce: group by (type, entity_type), merge ids
    const coalesced = new Map<string, DomainEvent>();
    for (const event of queued) {
      const key = `${event.type}:${event.entity_type}`;
      const existing = coalesced.get(key);
      if (existing) {
        const mergedIds = [...new Set([...existing.ids, ...event.ids])];
        coalesced.set(key, { ...existing, ids: mergedIds });
      } else {
        coalesced.set(key, { ...event });
      }
    }

    for (const event of coalesced.values()) {
      this.broadcastToListeners(event);
    }
  }

  emit(event: DomainEvent): void {
    if (this.batchQueue) {
      this.batchQueue.push(event);
      return;
    }
    this.broadcastToListeners(event);
  }

  private broadcastToListeners(event: DomainEvent): void {
    for (const fn of this.listeners) {
      try {
        fn(event);
      } catch {
        // listener errors must not break the emitter
      }
    }
  }
}
