import { render, screen } from "@testing-library/react";
import ActivityFeed from "../components/ActivityFeed";
import type { RealtimeEvent } from "../schemas";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      activityFeed: "Live Activity",
      noActivity: "No recent activity",
      connected: "Live updates active",
      disconnected: "Live updates paused",
    };
    return map[key] ?? key;
  },
}));

// Mock RealtimeProvider context
const mockRealtimeValue = {
  events: [] as RealtimeEvent[],
  connected: true,
  transport: "sse" as const,
};
jest.mock("@/components/shared/RealtimeProvider", () => ({
  useRealtime: () => mockRealtimeValue,
}));

function makeEvent(overrides: Partial<RealtimeEvent> = {}): RealtimeEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    type: "mutation",
    action: "create",
    entityType: "person",
    entityId: "p-1",
    actorEmail: "user@test.com",
    summary: "user@test.com created person",
    sessionId: "s1",
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("ActivityFeed", () => {
  beforeEach(() => {
    mockRealtimeValue.events = [];
    mockRealtimeValue.connected = true;
  });

  // Shows empty state when no events
  it("shows empty state when no events", () => {
    render(<ActivityFeed />);
    expect(screen.getByText("Live Activity")).toBeInTheDocument();
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  // Shows events in reverse order (newest first)
  it("renders events in reverse chronological order", () => {
    mockRealtimeValue.events = [
      makeEvent({ id: "e1", summary: "First event", timestamp: 1000 }),
      makeEvent({ id: "e2", summary: "Second event", timestamp: 2000 }),
      makeEvent({ id: "e3", summary: "Third event", timestamp: 3000 }),
    ];
    render(<ActivityFeed />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    // Newest first
    expect(items[0]).toHaveTextContent("Third event");
    expect(items[2]).toHaveTextContent("First event");
  });

  // Limits visible events to 20
  it("limits visible events to 20", () => {
    mockRealtimeValue.events = Array.from({ length: 30 }, (_, i) =>
      makeEvent({ id: `e${i}`, summary: `Event ${i}` }),
    );
    render(<ActivityFeed />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(20);
  });

  // Shows the header with connection indicator
  it("shows the activity feed header", () => {
    render(<ActivityFeed />);
    expect(screen.getByText("Live Activity")).toBeInTheDocument();
  });

  // Renders different action icons
  it("renders create, update, and delete events with different icons", () => {
    mockRealtimeValue.events = [
      makeEvent({ id: "e1", action: "create", summary: "Created" }),
      makeEvent({ id: "e2", action: "update", summary: "Updated" }),
      makeEvent({ id: "e3", action: "delete", summary: "Deleted" }),
    ];
    render(<ActivityFeed />);
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("Deleted")).toBeInTheDocument();
  });
});
