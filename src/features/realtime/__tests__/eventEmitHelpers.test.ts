import { buildSummary, emitMutationEvent } from "@/lib/eventEmitHelpers";
import { _getEmitter, clearSessionEvents } from "@/lib/eventBus";
import type { RealtimeEvent } from "../schemas";

describe("buildSummary", () => {
  // Builds summary with actor email
  it("returns actor + verb + entity for known action", () => {
    expect(buildSummary("create", "person", "admin@test.com")).toBe(
      "admin@test.com created person",
    );
  });

  // Falls back to "System" for null email
  it('uses "System" when actorEmail is null', () => {
    expect(buildSummary("update", "team", null)).toBe("System updated team");
  });

  // Uses human-readable entity names
  it("formats compound entity types", () => {
    expect(buildSummary("delete", "teamMember", "user@test.com")).toBe(
      "user@test.com deleted team member",
    );
  });

  // Falls back to raw action if not in map
  it("falls back to raw action string for unknown actions", () => {
    expect(
      buildSummary("session_login" as Parameters<typeof buildSummary>[0], "auth", "user@test.com"),
    ).toBe("user@test.com session_login auth");
  });

  // Handles approve/reject
  it("handles approve and reject actions", () => {
    expect(buildSummary("approve", "leaveRequest", "mgr@test.com")).toBe(
      "mgr@test.com approved leave request",
    );
    expect(buildSummary("reject", "leaveRequest", "mgr@test.com")).toBe(
      "mgr@test.com rejected leave request",
    );
  });
});

describe("emitMutationEvent", () => {
  afterEach(() => {
    _getEmitter().removeAllListeners();
    clearSessionEvents("session-1");
  });

  // Emits an event with correct fields
  it("emits a mutation event through the event bus", () => {
    const received: RealtimeEvent[] = [];
    const { subscribeEvents } = jest.requireActual(
      "@/lib/eventBus",
    ) as typeof import("@/lib/eventBus");
    const unsub = subscribeEvents("session-1", (e: RealtimeEvent) => received.push(e));

    emitMutationEvent({
      action: "create",
      entityType: "person",
      entityId: "p-1",
      actorEmail: "admin@test.com",
      sessionId: "session-1",
    });

    unsub();

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("mutation");
    expect(received[0].action).toBe("create");
    expect(received[0].entityType).toBe("person");
    expect(received[0].entityId).toBe("p-1");
    expect(received[0].actorEmail).toBe("admin@test.com");
    expect(received[0].sessionId).toBe("session-1");
    expect(received[0].summary).toBe("admin@test.com created person");
    expect(typeof received[0].id).toBe("string");
    expect(typeof received[0].timestamp).toBe("number");
  });
});
