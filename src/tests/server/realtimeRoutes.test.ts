// The realtime SSE/poll routes are excluded from the proxy matcher, so they must
// enforce the 2FA gate themselves. These tests pin that in-handler enforcement.
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({ auth: () => mockAuth() }));
jest.mock("@/demoSession", () => ({ getDemoSessionId: jest.fn().mockResolvedValue(null) }));
jest.mock("@/lib/eventBus", () => ({
  subscribeEvents: jest.fn().mockReturnValue(() => {}),
  getRecentEvents: jest.fn().mockReturnValue([]),
}));

import { GET as sseGet } from "@/app/api/realtime/sse/route";
import { GET as pollGet } from "@/app/api/realtime/poll/route";

const pollReq = () => new Request("http://localhost/api/realtime/poll");
const sseReq = () => new Request("http://localhost/api/realtime/sse");

afterEach(() => jest.clearAllMocks());

describe("realtime route 2FA enforcement", () => {
  test("poll returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await pollGet(pollReq())).status).toBe(401);
  });

  test("poll returns 403 when 2FA required but not verified", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", twoFactorRequired: true, twoFactorVerified: false },
    });
    expect((await pollGet(pollReq())).status).toBe(403);
  });

  test("poll succeeds when 2FA is verified", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", twoFactorRequired: true, twoFactorVerified: true },
    });
    expect((await pollGet(pollReq())).status).toBe(200);
  });

  test("sse returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await sseGet(sseReq())).status).toBe(401);
  });

  test("sse returns 403 when 2FA required but not verified", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", twoFactorRequired: true, twoFactorVerified: false },
    });
    expect((await sseGet(sseReq())).status).toBe(403);
  });
});
