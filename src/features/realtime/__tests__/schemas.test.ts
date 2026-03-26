import { RealtimeEventSchema } from "../schemas";

describe("RealtimeEventSchema", () => {
  const validEvent = {
    id: "abc-123",
    type: "mutation" as const,
    action: "create" as const,
    entityType: "person" as const,
    entityId: "person-1",
    actorEmail: "admin@example.com",
    summary: "admin@example.com created person",
    sessionId: "session-1",
    timestamp: Date.now(),
  };

  // Parses a valid mutation event
  it("parses a valid mutation event", () => {
    const result = RealtimeEventSchema.parse(validEvent);
    expect(result).toEqual(validEvent);
  });

  // Parses a valid notification event
  it("parses a valid notification event", () => {
    const result = RealtimeEventSchema.parse({ ...validEvent, type: "notification" });
    expect(result.type).toBe("notification");
  });

  // Accepts null entityId and actorEmail
  it("accepts null entityId and actorEmail", () => {
    const result = RealtimeEventSchema.parse({
      ...validEvent,
      entityId: null,
      actorEmail: null,
      sessionId: null,
    });
    expect(result.entityId).toBeNull();
    expect(result.actorEmail).toBeNull();
    expect(result.sessionId).toBeNull();
  });

  // Rejects invalid type
  it("rejects invalid type", () => {
    expect(() => RealtimeEventSchema.parse({ ...validEvent, type: "invalid" })).toThrow();
  });

  // Rejects invalid action
  it("rejects invalid action", () => {
    expect(() => RealtimeEventSchema.parse({ ...validEvent, action: "invalid" })).toThrow();
  });

  // Rejects invalid entityType
  it("rejects invalid entityType", () => {
    expect(() => RealtimeEventSchema.parse({ ...validEvent, entityType: "invalid" })).toThrow();
  });

  // Rejects missing required fields
  it("rejects missing required fields", () => {
    expect(() => RealtimeEventSchema.parse({})).toThrow();
    expect(() => RealtimeEventSchema.parse({ id: "x" })).toThrow();
  });

  // Rejects non-number timestamp
  it("rejects non-number timestamp", () => {
    expect(() => RealtimeEventSchema.parse({ ...validEvent, timestamp: "not-a-number" })).toThrow();
  });

  // Validates all audit actions are accepted
  it("accepts all audit action values", () => {
    const actions = [
      "create",
      "update",
      "delete",
      "approve",
      "reject",
      "import",
      "export",
      "seed",
      "reset",
      "kickout",
    ];
    for (const action of actions) {
      const result = RealtimeEventSchema.parse({ ...validEvent, action });
      expect(result.action).toBe(action);
    }
  });

  // Validates all entity types are accepted
  it("accepts all entity type values", () => {
    const types = [
      "person",
      "team",
      "teamMember",
      "department",
      "leaveRequest",
      "reviewCycle",
      "position",
    ];
    for (const entityType of types) {
      const result = RealtimeEventSchema.parse({ ...validEvent, entityType });
      expect(result.entityType).toBe(entityType);
    }
  });
});
