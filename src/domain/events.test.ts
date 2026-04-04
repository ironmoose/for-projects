import { describe, it, expect } from "bun:test";
import { EventBus } from "./events";
import type { DomainEvent } from "./events";

describe("EventBus", () => {
  describe("immediate delivery (no batching)", () => {
    it("delivers events immediately when not batching", () => {
      const bus = new EventBus();
      const received: DomainEvent[] = [];
      bus.subscribe((e) => received.push(e));

      bus.emit({ type: "created", entity_type: "task", ids: ["1"] });

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ type: "created", entity_type: "task", ids: ["1"] });
    });

    it("delivers to multiple listeners", () => {
      const bus = new EventBus();
      const r1: DomainEvent[] = [];
      const r2: DomainEvent[] = [];
      bus.subscribe((e) => r1.push(e));
      bus.subscribe((e) => r2.push(e));

      bus.emit({ type: "updated", entity_type: "project", ids: ["p1"] });

      expect(r1).toHaveLength(1);
      expect(r2).toHaveLength(1);
    });

    it("unsubscribe removes listener", () => {
      const bus = new EventBus();
      const received: DomainEvent[] = [];
      const unsub = bus.subscribe((e) => received.push(e));

      bus.emit({ type: "created", entity_type: "task", ids: ["1"] });
      unsub();
      bus.emit({ type: "created", entity_type: "task", ids: ["2"] });

      expect(received).toHaveLength(1);
    });

    it("listener errors do not break the emitter", () => {
      const bus = new EventBus();
      const received: DomainEvent[] = [];
      bus.subscribe(() => { throw new Error("boom"); });
      bus.subscribe((e) => received.push(e));

      bus.emit({ type: "created", entity_type: "task", ids: ["1"] });

      expect(received).toHaveLength(1);
    });
  });

  describe("batching", () => {
    it("queues events during a batch and delivers on flush", () => {
      const bus = new EventBus();
      const received: DomainEvent[] = [];
      bus.subscribe((e) => received.push(e));

      bus.beginBatch();
      bus.emit({ type: "updated", entity_type: "task", ids: ["1"] });
      bus.emit({ type: "updated", entity_type: "task", ids: ["2"] });

      // Not delivered yet
      expect(received).toHaveLength(0);

      bus.flushBatch();

      // Coalesced into one event
      expect(received).toHaveLength(1);
      expect(received[0].type).toBe("updated");
      expect(received[0].entity_type).toBe("task");
      expect(received[0].ids).toEqual(expect.arrayContaining(["1", "2"]));
      expect(received[0].ids).toHaveLength(2);
    });

    it("coalesces events by (type, entity_type) with deduplicated ids", () => {
      const bus = new EventBus();
      const received: DomainEvent[] = [];
      bus.subscribe((e) => received.push(e));

      bus.beginBatch();
      bus.emit({ type: "updated", entity_type: "task", ids: ["1", "2"] });
      bus.emit({ type: "updated", entity_type: "task", ids: ["2", "3"] });
      bus.flushBatch();

      expect(received).toHaveLength(1);
      expect(received[0].ids).toEqual(expect.arrayContaining(["1", "2", "3"]));
      expect(received[0].ids).toHaveLength(3);
    });

    it("delivers different (type, entity_type) combinations separately", () => {
      const bus = new EventBus();
      const received: DomainEvent[] = [];
      bus.subscribe((e) => received.push(e));

      bus.beginBatch();
      bus.emit({ type: "updated", entity_type: "task", ids: ["t1"] });
      bus.emit({ type: "created", entity_type: "task", ids: ["t2"] });
      bus.emit({ type: "updated", entity_type: "project", ids: ["p1"] });
      bus.flushBatch();

      expect(received).toHaveLength(3);
      const types = received.map((e) => `${e.type}:${e.entity_type}`);
      expect(types).toContain("updated:task");
      expect(types).toContain("created:task");
      expect(types).toContain("updated:project");
    });

    it("nested beginBatch is a no-op", () => {
      const bus = new EventBus();
      const received: DomainEvent[] = [];
      bus.subscribe((e) => received.push(e));

      bus.beginBatch();
      bus.emit({ type: "updated", entity_type: "task", ids: ["1"] });

      // Nested begin -- should not reset the queue
      bus.beginBatch();
      bus.emit({ type: "updated", entity_type: "task", ids: ["2"] });

      bus.flushBatch();

      // Both events should be coalesced (inner beginBatch was a no-op)
      expect(received).toHaveLength(1);
      expect(received[0].ids).toEqual(expect.arrayContaining(["1", "2"]));
    });

    it("flushBatch without beginBatch is a no-op", () => {
      const bus = new EventBus();
      const received: DomainEvent[] = [];
      bus.subscribe((e) => received.push(e));

      // Should not throw
      bus.flushBatch();

      expect(received).toHaveLength(0);
    });

    it("empty batch flush is a no-op", () => {
      const bus = new EventBus();
      const received: DomainEvent[] = [];
      bus.subscribe((e) => received.push(e));

      bus.beginBatch();
      bus.flushBatch();

      expect(received).toHaveLength(0);
    });

    it("events are delivered immediately again after flush", () => {
      const bus = new EventBus();
      const received: DomainEvent[] = [];
      bus.subscribe((e) => received.push(e));

      bus.beginBatch();
      bus.emit({ type: "updated", entity_type: "task", ids: ["1"] });
      bus.flushBatch();

      expect(received).toHaveLength(1);

      // Now emit without batching -- should be delivered immediately
      bus.emit({ type: "created", entity_type: "task", ids: ["2"] });
      expect(received).toHaveLength(2);
    });
  });
});
