import {
  emitRealtimeEvent,
  subscribeEvents,
  getRecentEvents,
  clearSessionEvents,
  _getEmitter,
} from "@/lib/eventBus";
import type { RealtimeEvent } from "../schemas";

function makeEvent(overrides: Partial<RealtimeEvent> = {}): RealtimeEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    type: "mutation",
    action: "create",
    entityType: "person",
    entityId: "p-1",
    actorEmail: "user@test.com",
    summary: "user@test.com created person",
    sessionId: "session-1",
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("eventBus", () => {
  afterEach(() => {
    // Clear all listeners and buffers between tests
    _getEmitter().removeAllListeners();
    clearSessionEvents("session-1");
    clearSessionEvents("session-2");
    clearSessionEvents(null);
  });

  // emitRealtimeEvent stores events in the ring buffer
  it("stores events in ring buffer", () => {
    const event = makeEvent();
    emitRealtimeEvent(event);
    const recent = getRecentEvents("session-1", 0);
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe(event.id);
  });

  // emitRealtimeEvent emits to subscribers
  it("emits events to subscribers", () => {
    const received: RealtimeEvent[] = [];
    subscribeEvents("session-1", (e) => received.push(e));

    const event = makeEvent();
    emitRealtimeEvent(event);

    expect(received).toHaveLength(1);
    expect(received[0].id).toBe(event.id);
  });

  // subscribeEvents filters by sessionId
  it("filters events by sessionId", () => {
    const session1Events: RealtimeEvent[] = [];
    const session2Events: RealtimeEvent[] = [];
    subscribeEvents("session-1", (e) => session1Events.push(e));
    subscribeEvents("session-2", (e) => session2Events.push(e));

    emitRealtimeEvent(makeEvent({ sessionId: "session-1" }));
    emitRealtimeEvent(makeEvent({ sessionId: "session-2" }));

    expect(session1Events).toHaveLength(1);
    expect(session2Events).toHaveLength(1);
  });

  // Unsubscribe stops receiving events
  it("unsubscribe stops receiving events", () => {
    const received: RealtimeEvent[] = [];
    const unsub = subscribeEvents("session-1", (e) => received.push(e));

    emitRealtimeEvent(makeEvent());
    unsub();
    emitRealtimeEvent(makeEvent());

    expect(received).toHaveLength(1);
  });

  // Ring buffer evicts oldest events when exceeding max size
  it("evicts oldest events when buffer exceeds 100", () => {
    for (let i = 0; i < 110; i++) {
      emitRealtimeEvent(makeEvent({ id: `evt-${i}`, timestamp: i }));
    }
    const events = getRecentEvents("session-1", -1);
    expect(events).toHaveLength(100);
    expect(events[0].id).toBe("evt-10"); // first 10 evicted
    expect(events[99].id).toBe("evt-109");
  });

  // getRecentEvents filters by timestamp
  it("returns only events after the given timestamp", () => {
    emitRealtimeEvent(makeEvent({ timestamp: 100 }));
    emitRealtimeEvent(makeEvent({ timestamp: 200 }));
    emitRealtimeEvent(makeEvent({ timestamp: 300 }));

    const events = getRecentEvents("session-1", 150);
    expect(events).toHaveLength(2);
    expect(events[0].timestamp).toBe(200);
    expect(events[1].timestamp).toBe(300);
  });

  // getRecentEvents returns empty array for unknown session
  it("returns empty array for unknown session", () => {
    const events = getRecentEvents("nonexistent", 0);
    expect(events).toHaveLength(0);
  });

  // clearSessionEvents removes the buffer for a session
  it("clears the buffer for a session", () => {
    emitRealtimeEvent(makeEvent());
    expect(getRecentEvents("session-1", 0)).toHaveLength(1);

    clearSessionEvents("session-1");
    expect(getRecentEvents("session-1", 0)).toHaveLength(0);
  });

  // Null sessionId works for both emit and subscribe
  it("handles null sessionId", () => {
    const received: RealtimeEvent[] = [];
    subscribeEvents(null, (e) => received.push(e));

    emitRealtimeEvent(makeEvent({ sessionId: null }));
    expect(received).toHaveLength(1);

    const recent = getRecentEvents(null, 0);
    expect(recent).toHaveLength(1);
  });
});
