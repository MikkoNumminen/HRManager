// Tests the /api/calendar route's gating and input validation.
const mockHasPermission = jest.fn();
jest.mock("@/permissions", () => ({ hasPermission: () => mockHasPermission() }));
jest.mock("@/demoSession", () => ({ getDemoSessionId: jest.fn().mockResolvedValue(null) }));

const mockFindMany = jest.fn();
jest.mock("@/db", () => ({
  prisma: { leaveRequest: { findMany: (...args: unknown[]) => mockFindMany(...args) } },
}));
jest.mock("@/lib/ical", () => ({ generateICS: () => "BEGIN:VCALENDAR" }));

import { GET } from "@/app/api/calendar/route";

const req = (qs = "") => new Request(`http://localhost/api/calendar${qs}`);

describe("/api/calendar route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission.mockResolvedValue(true);
    mockFindMany.mockResolvedValue([]);
  });

  test("returns 403 without leave:view permission", async () => {
    mockHasPermission.mockResolvedValue(false);
    expect((await GET(req())).status).toBe(403);
  });

  test("returns 400 for a malformed personId (and does not query)", async () => {
    const res = await GET(req("?personId=not-a-uuid"));
    expect(res.status).toBe(400);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  test("serves the calendar when no personId is given", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalled();
  });

  test("accepts a valid UUID personId", async () => {
    const res = await GET(req("?personId=123e4567-e89b-12d3-a456-426614174000"));
    expect(res.status).toBe(200);
  });
});
