import { renderHook, act } from "@testing-library/react";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners: Record<string, ((e: { data: string }) => void)[]> = {};

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Auto-connect after a tick
    setTimeout(() => this.onopen?.(), 0);
  }

  addEventListener(type: string, cb: (e: { data: string }) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }

  removeEventListener() {}

  close() {}

  // Test helper to simulate an event
  simulateEvent(type: string, data: unknown) {
    for (const cb of this.listeners[type] ?? []) {
      cb({ data: JSON.stringify(data) });
    }
  }
}

// Mock fetch for polling
const mockFetch = jest.fn();

beforeAll(() => {
  // @ts-expect-error — mock global EventSource
  globalThis.EventSource = MockEventSource;
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  MockEventSource.instances = [];
  mockFetch.mockReset();
  jest.clearAllTimers();
});

describe("useRealtimeEvents", () => {
  // Returns initial state
  it("returns initial state when disabled", () => {
    const { result } = renderHook(() => useRealtimeEvents({ enabled: false }));
    expect(result.current.events).toEqual([]);
    expect(result.current.connected).toBe(false);
  });

  // SSE: connects and receives events
  it("connects via SSE and adds events", async () => {
    // Force SSE transport via env
    const origTransport = process.env.NEXT_PUBLIC_REALTIME_TRANSPORT;
    process.env.NEXT_PUBLIC_REALTIME_TRANSPORT = "sse";

    const { result } = renderHook(() => useRealtimeEvents({ enabled: true }));

    // Wait for EventSource to be created
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(MockEventSource.instances).toHaveLength(1);
    const es = MockEventSource.instances[0];

    // Simulate connection
    await act(async () => {
      es.onopen?.();
    });
    expect(result.current.connected).toBe(true);

    // Simulate a mutation event
    const event = {
      id: "e1",
      type: "mutation",
      action: "create",
      entityType: "person",
      entityId: "p1",
      actorEmail: "user@test.com",
      summary: "user@test.com created person",
      sessionId: "s1",
      timestamp: Date.now(),
    };

    act(() => {
      es.simulateEvent("mutation", event);
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe("e1");

    process.env.NEXT_PUBLIC_REALTIME_TRANSPORT = origTransport;
  });

  // Polling: fetches events
  it("connects via polling and fetches events", async () => {
    const origTransport = process.env.NEXT_PUBLIC_REALTIME_TRANSPORT;
    process.env.NEXT_PUBLIC_REALTIME_TRANSPORT = "poll";

    jest.useFakeTimers();

    const event = {
      id: "e1",
      type: "mutation",
      action: "create",
      entityType: "person",
      entityId: "p1",
      actorEmail: "user@test.com",
      summary: "user@test.com created person",
      sessionId: "s1",
      timestamp: Date.now(),
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ events: [event], cursor: event.timestamp }),
    });

    const { result } = renderHook(() => useRealtimeEvents({ enabled: true }));

    // Wait for initial poll
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(result.current.events).toHaveLength(1);
    expect(result.current.connected).toBe(true);

    jest.useRealTimers();
    process.env.NEXT_PUBLIC_REALTIME_TRANSPORT = origTransport;
  });

  // Calls onEvent callback
  it("calls onEvent callback for each event", async () => {
    const origTransport = process.env.NEXT_PUBLIC_REALTIME_TRANSPORT;
    process.env.NEXT_PUBLIC_REALTIME_TRANSPORT = "sse";

    const onEvent = jest.fn();
    renderHook(() => useRealtimeEvents({ enabled: true, onEvent }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const es = MockEventSource.instances[0];
    await act(async () => {
      es.onopen?.();
    });

    act(() => {
      es.simulateEvent("mutation", {
        id: "e1",
        type: "mutation",
        action: "create",
        entityType: "person",
        entityId: "p1",
        actorEmail: "user@test.com",
        summary: "test",
        sessionId: "s1",
        timestamp: Date.now(),
      });
    });

    expect(onEvent).toHaveBeenCalledTimes(1);

    process.env.NEXT_PUBLIC_REALTIME_TRANSPORT = origTransport;
  });

  // Limits stored events to 50
  it("limits stored events to MAX_EVENTS (50)", async () => {
    const origTransport = process.env.NEXT_PUBLIC_REALTIME_TRANSPORT;
    process.env.NEXT_PUBLIC_REALTIME_TRANSPORT = "sse";

    const { result } = renderHook(() => useRealtimeEvents({ enabled: true }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const es = MockEventSource.instances[0];
    await act(async () => {
      es.onopen?.();
    });

    // Emit 60 events
    act(() => {
      for (let i = 0; i < 60; i++) {
        es.simulateEvent("mutation", {
          id: `e${i}`,
          type: "mutation",
          action: "create",
          entityType: "person",
          entityId: `p${i}`,
          actorEmail: "user@test.com",
          summary: `Event ${i}`,
          sessionId: "s1",
          timestamp: Date.now() + i,
        });
      }
    });

    expect(result.current.events).toHaveLength(50);
    // Oldest events should be evicted
    expect(result.current.events[0].id).toBe("e10");

    process.env.NEXT_PUBLIC_REALTIME_TRANSPORT = origTransport;
  });
});
