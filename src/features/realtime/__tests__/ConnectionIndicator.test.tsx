import { render, screen } from "@testing-library/react";
import ConnectionIndicator from "../components/ConnectionIndicator";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      connected: "Live updates active",
      disconnected: "Live updates paused",
    };
    return map[key] ?? key;
  },
}));

// Mock RealtimeProvider context
const mockRealtimeValue = {
  events: [],
  connected: true,
  transport: "sse" as const,
};
jest.mock("@/components/shared/RealtimeProvider", () => ({
  useRealtime: () => mockRealtimeValue,
}));

describe("ConnectionIndicator", () => {
  beforeEach(() => {
    mockRealtimeValue.connected = true;
    mockRealtimeValue.transport = "sse";
  });

  // Shows connected status with aria-label
  it("shows connected status", () => {
    render(<ConnectionIndicator />);
    const indicator = screen.getByRole("status");
    expect(indicator).toHaveAttribute("aria-label", "Live updates active (SSE)");
  });

  // Shows disconnected status
  it("shows disconnected status", () => {
    mockRealtimeValue.connected = false;
    render(<ConnectionIndicator />);
    const indicator = screen.getByRole("status");
    expect(indicator).toHaveAttribute("aria-label", "Live updates paused");
  });

  // Returns null when transport is "none"
  it("returns null when transport is none", () => {
    mockRealtimeValue.transport = "none" as "sse";
    const { container } = render(<ConnectionIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  // Shows POLL for polling transport
  it("shows POLL for polling transport", () => {
    mockRealtimeValue.transport = "poll" as "sse";
    render(<ConnectionIndicator />);
    const indicator = screen.getByRole("status");
    expect(indicator).toHaveAttribute("aria-label", "Live updates active (POLL)");
  });
});
