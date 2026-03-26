import { render, screen } from "@testing-library/react";
import RealtimeProvider, { useRealtime } from "@/components/shared/RealtimeProvider";
import type { RealtimeEvent } from "../schemas";

// Mock next-auth/react
const mockSession = {
  user: { email: "admin@test.com", id: "u1", name: "Admin" },
  expires: "2099-01-01",
};
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: mockSession })),
}));

// Mock SnackbarProvider
const mockShowSnackbar = jest.fn();
jest.mock("@/components/shared/SnackbarProvider", () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));

// Mock useRealtimeEvents
const mockOnEvent = { current: null as ((e: RealtimeEvent) => void) | null };
const mockReturn = { events: [] as RealtimeEvent[], connected: true, transport: "sse" as const };
jest.mock("@/hooks/useRealtimeEvents", () => ({
  useRealtimeEvents: (opts: { onEvent?: (e: RealtimeEvent) => void }) => {
    mockOnEvent.current = opts.onEvent ?? null;
    return mockReturn;
  },
}));

// Test component to read context
function TestConsumer() {
  const { events, connected, transport } = useRealtime();
  return (
    <div>
      <span data-testid="connected">{String(connected)}</span>
      <span data-testid="transport">{transport}</span>
      <span data-testid="events">{events.length}</span>
    </div>
  );
}

describe("RealtimeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReturn.events = [];
    mockReturn.connected = true;
    mockReturn.transport = "sse";
  });

  // Provides context values to children
  it("provides realtime context to children", () => {
    render(
      <RealtimeProvider>
        <TestConsumer />
      </RealtimeProvider>,
    );
    expect(screen.getByTestId("connected")).toHaveTextContent("true");
    expect(screen.getByTestId("transport")).toHaveTextContent("sse");
    expect(screen.getByTestId("events")).toHaveTextContent("0");
  });

  // Skips self-notifications
  it("does not show snackbar for own events", () => {
    render(
      <RealtimeProvider>
        <div />
      </RealtimeProvider>,
    );
    // Simulate an event from the current user
    mockOnEvent.current?.({
      id: "e1",
      type: "mutation",
      action: "create",
      entityType: "person",
      entityId: "p1",
      actorEmail: "admin@test.com", // same as session user
      summary: "admin@test.com created person",
      sessionId: "s1",
      timestamp: Date.now(),
    });
    expect(mockShowSnackbar).not.toHaveBeenCalled();
  });

  // Shows snackbar for events from other users
  it("shows snackbar for events from other users", () => {
    render(
      <RealtimeProvider>
        <div />
      </RealtimeProvider>,
    );
    mockOnEvent.current?.({
      id: "e2",
      type: "mutation",
      action: "update",
      entityType: "team",
      entityId: "t1",
      actorEmail: "other@test.com",
      summary: "other@test.com updated team",
      sessionId: "s1",
      timestamp: Date.now(),
    });
    expect(mockShowSnackbar).toHaveBeenCalledWith("other@test.com updated team", "info");
  });

  // Shows snackbar for system events (null actorEmail)
  it("shows snackbar for system events", () => {
    render(
      <RealtimeProvider>
        <div />
      </RealtimeProvider>,
    );
    mockOnEvent.current?.({
      id: "e3",
      type: "mutation",
      action: "seed",
      entityType: "person",
      entityId: null,
      actorEmail: null,
      summary: "System seeded person",
      sessionId: "s1",
      timestamp: Date.now(),
    });
    expect(mockShowSnackbar).toHaveBeenCalledWith("System seeded person", "info");
  });
});
