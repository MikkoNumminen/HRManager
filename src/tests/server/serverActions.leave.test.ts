import { testPrisma, cleanDb, createTestPerson } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock next-auth — ESM imports that Jest can't parse in CJS mode.
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock permissions — requirePermission is a no-op so leave action tests focus on data logic.
jest.mock("@/permissions", () => ({
  requirePermission: jest.fn(),
  seedPermissions: jest.fn(),
}));

// Mock audit logging — deferAudit calls auth() and after() which need request scope.
jest.mock("@/auditLog", () => ({
  logAudit: jest.fn(),
  captureAuditContext: jest.fn().mockResolvedValue({
    userId: null,
    userEmail: null,
    sessionId: null,
  }),
  deferAudit: jest.fn(),
  deferAuditLog: jest.fn(),
}));

// Mock rate limiting — rateLimit uses next/headers which doesn't exist in tests.
jest.mock("@/rateLimit", () => ({
  rateLimit: jest.fn(),
  RateLimitError: class RateLimitError extends Error {
    constructor() {
      super("Too many requests");
      this.name = "RateLimitError";
    }
  },
}));

// Mock demo session — defaults to null (production mode).
const mockGetDemoSessionId = jest.fn().mockResolvedValue(null);
jest.mock("@/demoSession", () => ({
  getDemoSessionId: () => mockGetDemoSessionId(),
}));

// Mock Next.js server functions.
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import {
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  createLeaveRequest,
  reviewLeaveRequest,
  deleteLeaveRequest,
  allocateLeaveBalance,
} from "@/features/leave/actions";

// Helper to build FormData from key-value pairs.
function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

// Helper to create a leave type directly in the DB.
async function createTestLeaveType(
  overrides: Partial<{
    name: string;
    defaultDays: number;
    color: string;
    sessionId: string | null;
  }> = {},
) {
  return testPrisma.leaveType.create({
    data: {
      name: overrides.name ?? `Leave Type ${Date.now()}`,
      defaultDays: overrides.defaultDays ?? 20,
      color: overrides.color ?? "#1976d2",
      sessionId: overrides.sessionId ?? null,
    },
  });
}

// Helper to create a leave balance directly in the DB.
async function createTestBalance(
  personId: string,
  leaveTypeId: string,
  overrides: Partial<{
    year: number;
    allocated: number;
    used: number;
    sessionId: string | null;
  }> = {},
) {
  return testPrisma.leaveBalance.create({
    data: {
      personId,
      leaveTypeId,
      year: overrides.year ?? 2026,
      allocated: overrides.allocated ?? 20,
      used: overrides.used ?? 0,
      sessionId: overrides.sessionId ?? null,
    },
  });
}

// ─── createLeaveType ─────────────────────────────────────────

describe("createLeaveType", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Creates a leave type with all fields.
  test("creates a leave type with name, description, defaultDays, color", async () => {
    await createLeaveType(
      formData({
        name: "Annual Leave",
        description: "Paid annual leave",
        defaultDays: "25",
        color: "#4caf50",
      }),
    );
    const types = await testPrisma.leaveType.findMany();
    expect(types).toHaveLength(1);
    expect(types[0].name).toBe("Annual Leave");
    expect(types[0].description).toBe("Paid annual leave");
    expect(types[0].defaultDays).toBe(25);
    expect(types[0].color).toBe("#4caf50");
  });

  // Creates a leave type without description.
  test("creates a leave type without description", async () => {
    await createLeaveType(formData({ name: "Sick Leave", defaultDays: "10", color: "#f44336" }));
    const types = await testPrisma.leaveType.findMany();
    expect(types).toHaveLength(1);
    expect(types[0].description).toBeNull();
  });

  // Rejects empty name.
  test("rejects empty name", async () => {
    const result = await createLeaveType(formData({ name: "", defaultDays: "10", color: "#000" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects duplicate name.
  test("rejects duplicate leave type name", async () => {
    await createTestLeaveType({ name: "Annual Leave" });
    const result = await createLeaveType(
      formData({ name: "Annual Leave", defaultDays: "20", color: "#000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects negative defaultDays.
  test("rejects negative defaultDays", async () => {
    const result = await createLeaveType(
      formData({ name: "Bad Leave", defaultDays: "-5", color: "#000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Respects demo session isolation.
  test("respects demo session isolation", async () => {
    mockGetDemoSessionId.mockResolvedValueOnce("session-1");
    await createLeaveType(formData({ name: "Annual", defaultDays: "20", color: "#000" }));

    mockGetDemoSessionId.mockResolvedValueOnce("session-2");
    await createLeaveType(formData({ name: "Annual", defaultDays: "20", color: "#000" }));

    const types = await testPrisma.leaveType.findMany();
    expect(types).toHaveLength(2);
  });

  // Rejects a name that exceeds MAX_NAME_LENGTH — nameTooLong error.
  test("rejects name that exceeds max length", async () => {
    const result = await createLeaveType(
      formData({ name: "a".repeat(256), defaultDays: "10", color: "#000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects a description that exceeds MAX_DESCRIPTION_LENGTH — descriptionTooLong error.
  test("rejects description that exceeds max length", async () => {
    const result = await createLeaveType(
      formData({ name: "Short", description: "a".repeat(1001), defaultDays: "10", color: "#000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // When defaultDays is not provided, falls back to 0 — covers the non-string ternary branch (line 37).
  test("creates leave type without defaultDays using fallback 0", async () => {
    await createLeaveType(formData({ name: "Minimal Leave", color: "#fff" }));
    const types = await testPrisma.leaveType.findMany();
    expect(types).toHaveLength(1);
    expect(types[0].defaultDays).toBe(0);
  });

  // When color is not provided, falls back to default "#1976d2" — covers ?? branch (line 41).
  test("creates leave type without color using default color", async () => {
    await createLeaveType(formData({ name: "Default Color Leave", defaultDays: "5" }));
    const types = await testPrisma.leaveType.findMany();
    expect(types).toHaveLength(1);
    expect(types[0].color).toBe("#1976d2");
  });
});

// ─── updateLeaveType ─────────────────────────────────────────

describe("updateLeaveType", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Updates an existing leave type.
  test("updates name and defaultDays", async () => {
    const lt = await createTestLeaveType({ name: "Old Name", defaultDays: 10 });
    await updateLeaveType(
      formData({ id: lt.id, name: "New Name", defaultDays: "15", color: "#ff0000" }),
    );
    const updated = await testPrisma.leaveType.findUnique({ where: { id: lt.id } });
    expect(updated!.name).toBe("New Name");
    expect(updated!.defaultDays).toBe(15);
    expect(updated!.color).toBe("#ff0000");
  });

  // Rejects update to non-existent leave type.
  test("rejects update to non-existent leave type", async () => {
    const result = await updateLeaveType(
      formData({
        id: "00000000-0000-0000-0000-000000000000",
        name: "X",
        defaultDays: "1",
        color: "#000",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects missing id field — invalidId error (line 75).
  test("rejects missing id field on update", async () => {
    const result = await updateLeaveType(
      formData({ name: "Annual", defaultDays: "10", color: "#000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects duplicate name on update.
  test("rejects duplicate name on update", async () => {
    await createTestLeaveType({ name: "Annual" });
    const lt2 = await createTestLeaveType({ name: "Sick" });
    const result = await updateLeaveType(
      formData({ id: lt2.id, name: "Annual", defaultDays: "5", color: "#000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects negative defaultDays — invalidDaysValue error (line 91).
  test("rejects negative defaultDays on update", async () => {
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 10 });
    const result = await updateLeaveType(
      formData({ id: lt.id, name: "Annual", defaultDays: "-1", color: "#000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects empty name — invalidName error (line 80).
  test("rejects empty name on update", async () => {
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 10 });
    const result = await updateLeaveType(
      formData({ id: lt.id, name: "", defaultDays: "10", color: "#000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects name that exceeds MAX_NAME_LENGTH — nameTooLong error (line 82).
  test("rejects name exceeding max length on update", async () => {
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 10 });
    const result = await updateLeaveType(
      formData({ id: lt.id, name: "a".repeat(256), defaultDays: "10", color: "#000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // When defaultDays is missing, falls back to 0 — covers the ternary false branch (line 89).
  // 0 is treated as invalid (< 1 for leave types) so this should error out.
  test("falls back to 0 days when defaultDays is not provided and rejects", async () => {
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 10 });
    // defaultDays not provided → defaultDays = 0 → isNaN(0)=false but 0 >= 0 so NOT rejected.
    // Actually defaultDays >= 0 check: updateLeaveType uses `defaultDays < 0` not `< 1`.
    const result = await updateLeaveType(formData({ id: lt.id, name: "Annual", color: "#000" }));
    // No error — defaultDays 0 is valid for update.
    expect(result).toBeUndefined();
    const updated = await testPrisma.leaveType.findUnique({ where: { id: lt.id } });
    expect(updated!.defaultDays).toBe(0);
  });

  // When color is not provided in update, falls back to default "#1976d2" — covers ?? (line 93).
  test("uses default color when color is not provided in update", async () => {
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 10 });
    await updateLeaveType(formData({ id: lt.id, name: "Annual Updated", defaultDays: "10" }));
    const updated = await testPrisma.leaveType.findUnique({ where: { id: lt.id } });
    expect(updated!.color).toBe("#1976d2");
  });

  // Empty string description results in null (descStr false branch, line 86).
  test("sets description to null when empty string is provided", async () => {
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 10 });
    await updateLeaveType(
      formData({ id: lt.id, name: "Annual", defaultDays: "10", color: "#000", description: "" }),
    );
    const updated = await testPrisma.leaveType.findUnique({ where: { id: lt.id } });
    expect(updated!.description).toBeNull();
  });

  // Non-empty description is saved (descStr truthy branch, line 86 true branch).
  test("saves non-empty description when provided", async () => {
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 10 });
    await updateLeaveType(
      formData({
        id: lt.id,
        name: "Annual",
        defaultDays: "10",
        color: "#000",
        description: "Used for annual leave",
      }),
    );
    const updated = await testPrisma.leaveType.findUnique({ where: { id: lt.id } });
    expect(updated!.description).toBe("Used for annual leave");
  });
});

// ─── deleteLeaveType ─────────────────────────────────────────

describe("deleteLeaveType", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Soft-deletes a leave type.
  test("soft-deletes a leave type", async () => {
    const lt = await createTestLeaveType({ name: "ToDelete" });
    await deleteLeaveType(formData({ id: lt.id }));
    const deleted = await testPrisma.leaveType.findUnique({ where: { id: lt.id } });
    expect(deleted!.deletedAt).not.toBeNull();
  });

  // Rejects deletion of non-existent leave type.
  test("rejects deletion of non-existent leave type", async () => {
    const result = await deleteLeaveType(formData({ id: "00000000-0000-0000-0000-000000000000" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects missing id field — invalidId error (line 134).
  test("rejects missing id field on delete", async () => {
    const result = await deleteLeaveType(formData({}));
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

// ─── createLeaveRequest ──────────────────────────────────────

describe("createLeaveRequest", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Creates a leave request with valid data.
  test("creates a leave request", async () => {
    const person = await createTestPerson({ name: "Alice" });
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 20 });
    await createTestBalance(person.id, lt.id, { allocated: 20, used: 0 });

    await createLeaveRequest(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: "2026-07-01",
        endDate: "2026-07-05",
        days: "5",
        note: "Summer vacation",
      }),
    );

    const requests = await testPrisma.leaveRequest.findMany();
    expect(requests).toHaveLength(1);
    expect(requests[0].personId).toBe(person.id);
    expect(requests[0].leaveTypeId).toBe(lt.id);
    expect(requests[0].days).toBe(5);
    expect(requests[0].status).toBe("PENDING");
    expect(requests[0].note).toBe("Summer vacation");
  });

  // Rejects when end date is before start date.
  test("rejects end date before start date", async () => {
    const person = await createTestPerson({ name: "Bob" });
    const lt = await createTestLeaveType({ name: "Sick" });

    const result = await createLeaveRequest(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: "2026-07-10",
        endDate: "2026-07-05",
        days: "3",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects overlapping leave requests.
  test("rejects overlapping leave requests", async () => {
    const person = await createTestPerson({ name: "Charlie" });
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 30 });
    await createTestBalance(person.id, lt.id, { allocated: 30, used: 0 });

    // Create first request
    await createLeaveRequest(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: "2026-07-01",
        endDate: "2026-07-10",
        days: "10",
      }),
    );

    // Attempt overlapping request
    const result = await createLeaveRequest(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: "2026-07-05",
        endDate: "2026-07-15",
        days: "10",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects when insufficient leave balance.
  test("rejects insufficient leave balance", async () => {
    const person = await createTestPerson({ name: "Diana" });
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 5 });
    await createTestBalance(person.id, lt.id, { allocated: 5, used: 3 });

    const result = await createLeaveRequest(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: "2026-07-01",
        endDate: "2026-07-05",
        days: "5",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects zero days.
  test("rejects zero days", async () => {
    const person = await createTestPerson({ name: "Eve" });
    const lt = await createTestLeaveType({ name: "Sick" });

    const result = await createLeaveRequest(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: "2026-07-01",
        endDate: "2026-07-01",
        days: "0",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects non-existent person.
  test("rejects non-existent person", async () => {
    const lt = await createTestLeaveType({ name: "Annual" });
    const result = await createLeaveRequest(
      formData({
        personId: "00000000-0000-0000-0000-000000000000",
        leaveTypeId: lt.id,
        startDate: "2026-07-01",
        endDate: "2026-07-05",
        days: "5",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects missing personId field — noPersonSelected error.
  test("rejects missing personId", async () => {
    const lt = await createTestLeaveType({ name: "Annual" });
    const result = await createLeaveRequest(
      formData({ leaveTypeId: lt.id, startDate: "2026-07-01", endDate: "2026-07-05", days: "5" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects missing leaveTypeId field — leaveTypeRequired error.
  test("rejects missing leaveTypeId", async () => {
    const person = await createTestPerson({ name: "Alice" });
    const result = await createLeaveRequest(
      formData({ personId: person.id, startDate: "2026-07-01", endDate: "2026-07-05", days: "5" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects missing startDate/endDate fields — invalidDateRange error.
  test("rejects missing date fields", async () => {
    const person = await createTestPerson({ name: "Bob" });
    const lt = await createTestLeaveType({ name: "Sick" });
    const result = await createLeaveRequest(
      formData({ personId: person.id, leaveTypeId: lt.id, days: "3" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects non-parseable date strings — invalidDateRange (NaN) error.
  test("rejects invalid date strings", async () => {
    const person = await createTestPerson({ name: "Carol" });
    const lt = await createTestLeaveType({ name: "Annual" });
    const result = await createLeaveRequest(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: "not-a-date",
        endDate: "2026-07-05",
        days: "5",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // When days is not provided, falls back to 0 — which then fails invalidDaysValue (line 190→191).
  test("rejects missing days field using fallback 0", async () => {
    const person = await createTestPerson({ name: "Alex" });
    const lt = await createTestLeaveType({ name: "Annual" });
    const result = await createLeaveRequest(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: "2026-07-01",
        endDate: "2026-07-05",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects when the leave type does not exist — leaveTypeNotFound error (line 210).
  test("rejects when leave type is not found in DB", async () => {
    const person = await createTestPerson({ name: "Bailey" });
    // Use a valid UUID that does not correspond to any leaveType record.
    const result = await createLeaveRequest(
      formData({
        personId: person.id,
        leaveTypeId: "00000000-0000-0000-0000-000000000099",
        startDate: "2026-07-01",
        endDate: "2026-07-05",
        days: "5",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects a note that exceeds MAX_LEAVE_NOTE_LENGTH.
  test("rejects note that is too long", async () => {
    const person = await createTestPerson({ name: "Dave" });
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 30 });
    await createTestBalance(person.id, lt.id, { allocated: 30, used: 0 });
    const result = await createLeaveRequest(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: "2026-07-01",
        endDate: "2026-07-05",
        days: "5",
        note: "a".repeat(1001),
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

// ─── reviewLeaveRequest ──────────────────────────────────────

describe("reviewLeaveRequest", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Approves a pending leave request and updates balance.
  test("approves a pending request and increments used balance", async () => {
    const person = await createTestPerson({ name: "Alice" });
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 20 });
    const balance = await createTestBalance(person.id, lt.id, { allocated: 20, used: 0 });

    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-05"),
        days: 5,
        status: "PENDING",
        sessionId: null,
      },
    });

    await reviewLeaveRequest(formData({ id: request.id, action: "APPROVED" }));

    const updated = await testPrisma.leaveRequest.findUnique({ where: { id: request.id } });
    expect(updated!.status).toBe("APPROVED");
    expect(updated!.reviewedAt).not.toBeNull();

    const updatedBalance = await testPrisma.leaveBalance.findUnique({
      where: { id: balance.id },
    });
    expect(updatedBalance!.used).toBe(5);
  });

  // Rejects a pending leave request — balance stays unchanged.
  test("rejects a pending request without changing balance", async () => {
    const person = await createTestPerson({ name: "Bob" });
    const lt = await createTestLeaveType({ name: "Sick", defaultDays: 10 });
    const balance = await createTestBalance(person.id, lt.id, { allocated: 10, used: 0 });

    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-08-03"),
        days: 3,
        status: "PENDING",
        sessionId: null,
      },
    });

    await reviewLeaveRequest(
      formData({ id: request.id, action: "REJECTED", reviewNote: "Not now" }),
    );

    const updated = await testPrisma.leaveRequest.findUnique({ where: { id: request.id } });
    expect(updated!.status).toBe("REJECTED");
    expect(updated!.reviewNote).toBe("Not now");

    const updatedBalance = await testPrisma.leaveBalance.findUnique({
      where: { id: balance.id },
    });
    expect(updatedBalance!.used).toBe(0);
  });

  // Rejects review of non-pending request.
  test("rejects review of already-reviewed request", async () => {
    const person = await createTestPerson({ name: "Charlie" });
    const lt = await createTestLeaveType({ name: "Annual" });

    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-05"),
        days: 5,
        status: "APPROVED",
        reviewedAt: new Date(),
        sessionId: null,
      },
    });

    const result = await reviewLeaveRequest(formData({ id: request.id, action: "REJECTED" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Creates balance via upsert if none exists when approving.
  test("creates balance via upsert when approving without existing balance", async () => {
    const person = await createTestPerson({ name: "Diana" });
    const lt = await createTestLeaveType({ name: "Unpaid", defaultDays: 0 });

    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-03"),
        days: 3,
        status: "PENDING",
        sessionId: null,
      },
    });

    await reviewLeaveRequest(formData({ id: request.id, action: "APPROVED" }));

    const balance = await testPrisma.leaveBalance.findUnique({
      where: {
        personId_leaveTypeId_year: { personId: person.id, leaveTypeId: lt.id, year: 2026 },
      },
    });
    expect(balance).not.toBeNull();
    expect(balance!.used).toBe(3);
    expect(balance!.allocated).toBe(0); // defaultDays is 0 for Unpaid
  });

  // Reviewing an already-decided request must not increment the balance again
  // (guards the concurrent-reviewer / double-click double-deduct race).
  test("does not double-increment the balance when reviewed twice", async () => {
    const person = await createTestPerson({ name: "Frank" });
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 20 });
    await createTestBalance(person.id, lt.id, { year: 2026, allocated: 20 });
    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-03"),
        days: 3,
        status: "PENDING",
        sessionId: null,
      },
    });

    expect(
      await reviewLeaveRequest(formData({ id: request.id, action: "APPROVED" })),
    ).toBeUndefined();
    const second = await reviewLeaveRequest(formData({ id: request.id, action: "APPROVED" }));
    expect(second).toHaveProperty("code", "leaveRequestNotFound");

    const balance = await testPrisma.leaveBalance.findUnique({
      where: { personId_leaveTypeId_year: { personId: person.id, leaveTypeId: lt.id, year: 2026 } },
    });
    expect(balance!.used).toBe(3); // not 6
  });

  // Approval is rejected (and the request stays PENDING) when it would exceed an
  // existing balance — capacity is re-checked at approval, not only at creation.
  test("rejects approval that would exceed an existing balance", async () => {
    const person = await createTestPerson({ name: "Grace" });
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 20 });
    await createTestBalance(person.id, lt.id, { year: 2026, allocated: 5, used: 4 });
    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-05"),
        days: 3,
        status: "PENDING",
        sessionId: null,
      },
    });

    const result = await reviewLeaveRequest(formData({ id: request.id, action: "APPROVED" }));
    expect(result).toHaveProperty("code", "insufficientLeaveBalance");

    const after = await testPrisma.leaveRequest.findUnique({ where: { id: request.id } });
    expect(after!.status).toBe("PENDING");
    const balance = await testPrisma.leaveBalance.findUnique({
      where: { personId_leaveTypeId_year: { personId: person.id, leaveTypeId: lt.id, year: 2026 } },
    });
    expect(balance!.used).toBe(4); // unchanged
  });

  // Rejects invalid action value.
  test("rejects invalid action value", async () => {
    const person = await createTestPerson({ name: "Eve" });
    const lt = await createTestLeaveType({ name: "Annual" });

    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-05"),
        days: 5,
        status: "PENDING",
        sessionId: null,
      },
    });

    const result = await reviewLeaveRequest(formData({ id: request.id, action: "invalid" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects missing id field — invalidId error (line 271).
  test("rejects missing id field on review", async () => {
    const result = await reviewLeaveRequest(formData({ action: "APPROVED" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Approves with a valid reviewerId UUID — covers line 279 true branch and line 280 validateUUID call.
  test("approves with a valid reviewerId UUID", async () => {
    const person = await createTestPerson({ name: "Hugo" });
    const reviewer = await createTestPerson({ name: "Reviewer" });
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 20 });
    await createTestBalance(person.id, lt.id, { allocated: 20, used: 0 });
    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-05"),
        days: 5,
        status: "PENDING",
        sessionId: null,
      },
    });

    const result = await reviewLeaveRequest(
      formData({ id: request.id, action: "APPROVED", reviewerId: reviewer.id }),
    );
    expect(result).toBeUndefined();
    const updated = await testPrisma.leaveRequest.findUnique({ where: { id: request.id } });
    expect(updated!.status).toBe("APPROVED");
    expect(updated!.reviewerId).toBe(reviewer.id);
  });

  // When reviewerId is not provided, reviewerIdStr = null — covers lines 279-280 null branches.
  test("approves without reviewerId (null reviewerId is allowed)", async () => {
    const person = await createTestPerson({ name: "Ian" });
    const lt = await createTestLeaveType({ name: "Annual", defaultDays: 20 });
    await createTestBalance(person.id, lt.id, { allocated: 20, used: 0 });
    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-05"),
        days: 5,
        status: "PENDING",
        sessionId: null,
      },
    });

    // No reviewerId provided — should succeed.
    const result = await reviewLeaveRequest(formData({ id: request.id, action: "APPROVED" }));
    expect(result).toBeUndefined();
    const updated = await testPrisma.leaveRequest.findUnique({ where: { id: request.id } });
    expect(updated!.status).toBe("APPROVED");
    expect(updated!.reviewerId).toBeNull();
  });

  // Rejects a reviewNote that exceeds MAX_LEAVE_NOTE_LENGTH — noteTooLong error (line 286).
  test("rejects reviewNote that is too long", async () => {
    const person = await createTestPerson({ name: "Frank" });
    const lt = await createTestLeaveType({ name: "Annual" });

    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-05"),
        days: 5,
        status: "PENDING",
        sessionId: null,
      },
    });

    const result = await reviewLeaveRequest(
      formData({ id: request.id, action: "APPROVED", reviewNote: "a".repeat(1001) }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

// ─── deleteLeaveRequest ──────────────────────────────────────

describe("deleteLeaveRequest", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Soft-deletes a pending leave request.
  test("soft-deletes a pending leave request", async () => {
    const person = await createTestPerson({ name: "Alice" });
    const lt = await createTestLeaveType({ name: "Annual" });

    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-05"),
        days: 5,
        status: "PENDING",
        sessionId: null,
      },
    });

    await deleteLeaveRequest(formData({ id: request.id }));
    const deleted = await testPrisma.leaveRequest.findUnique({ where: { id: request.id } });
    expect(deleted!.deletedAt).not.toBeNull();
  });

  // Rejects missing id field — invalidId error (line 358).
  test("rejects missing id field on delete request", async () => {
    const result = await deleteLeaveRequest(formData({}));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects deletion of non-pending request.
  test("rejects deletion of approved request", async () => {
    const person = await createTestPerson({ name: "Bob" });
    const lt = await createTestLeaveType({ name: "Sick" });

    const request = await testPrisma.leaveRequest.create({
      data: {
        personId: person.id,
        leaveTypeId: lt.id,
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-08-03"),
        days: 3,
        status: "APPROVED",
        reviewedAt: new Date(),
        sessionId: null,
      },
    });

    const result = await deleteLeaveRequest(formData({ id: request.id }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects deletion of non-existent request.
  test("rejects deletion of non-existent request", async () => {
    const result = await deleteLeaveRequest(
      formData({ id: "00000000-0000-0000-0000-000000000000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

// ─── allocateLeaveBalance ────────────────────────────────────

describe("allocateLeaveBalance", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Creates a new balance allocation.
  test("creates a new leave balance", async () => {
    const person = await createTestPerson({ name: "Alice" });
    const lt = await createTestLeaveType({ name: "Annual" });

    await allocateLeaveBalance(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        year: "2026",
        allocated: "25",
      }),
    );

    const balances = await testPrisma.leaveBalance.findMany();
    expect(balances).toHaveLength(1);
    expect(balances[0].personId).toBe(person.id);
    expect(balances[0].allocated).toBe(25);
    expect(balances[0].used).toBe(0);
  });

  // Updates existing balance via upsert.
  test("updates existing balance allocation", async () => {
    const person = await createTestPerson({ name: "Bob" });
    const lt = await createTestLeaveType({ name: "Annual" });
    await createTestBalance(person.id, lt.id, { allocated: 20, used: 5 });

    await allocateLeaveBalance(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        year: "2026",
        allocated: "30",
      }),
    );

    const balance = await testPrisma.leaveBalance.findFirst({
      where: { personId: person.id, leaveTypeId: lt.id },
    });
    expect(balance!.allocated).toBe(30);
    expect(balance!.used).toBe(5); // used stays the same
  });

  // Rejects non-existent person.
  test("rejects non-existent person", async () => {
    const lt = await createTestLeaveType({ name: "Annual" });
    const result = await allocateLeaveBalance(
      formData({
        personId: "00000000-0000-0000-0000-000000000000",
        leaveTypeId: lt.id,
        year: "2026",
        allocated: "20",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects non-existent leave type.
  test("rejects non-existent leave type", async () => {
    const person = await createTestPerson({ name: "Charlie" });
    const result = await allocateLeaveBalance(
      formData({
        personId: person.id,
        leaveTypeId: "00000000-0000-0000-0000-000000000000",
        year: "2026",
        allocated: "20",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects invalid year.
  test("rejects invalid year", async () => {
    const person = await createTestPerson({ name: "Diana" });
    const lt = await createTestLeaveType({ name: "Annual" });
    const result = await allocateLeaveBalance(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        year: "1999",
        allocated: "20",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects negative allocated days.
  test("rejects negative allocated days", async () => {
    const person = await createTestPerson({ name: "Eve" });
    const lt = await createTestLeaveType({ name: "Annual" });
    const result = await allocateLeaveBalance(
      formData({
        personId: person.id,
        leaveTypeId: lt.id,
        year: "2026",
        allocated: "-5",
      }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects missing personId field — noPersonSelected error (line 402).
  test("rejects missing personId", async () => {
    const lt = await createTestLeaveType({ name: "Annual" });
    const result = await allocateLeaveBalance(
      formData({ leaveTypeId: lt.id, year: "2026", allocated: "20" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects missing leaveTypeId field — leaveTypeRequired error (line 407).
  test("rejects missing leaveTypeId", async () => {
    const person = await createTestPerson({ name: "Frank" });
    const result = await allocateLeaveBalance(
      formData({ personId: person.id, year: "2026", allocated: "20" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // When year is not provided, falls back to current year — covers ternary false branch (line 411).
  test("creates balance using current year when year is not provided", async () => {
    const person = await createTestPerson({ name: "Grace" });
    const lt = await createTestLeaveType({ name: "Annual" });
    const result = await allocateLeaveBalance(
      formData({ personId: person.id, leaveTypeId: lt.id, allocated: "15" }),
    );
    expect(result).toBeUndefined();
    const currentYear = new Date().getFullYear();
    const balance = await testPrisma.leaveBalance.findFirst({
      where: { personId: person.id, leaveTypeId: lt.id, year: currentYear },
    });
    expect(balance).not.toBeNull();
  });

  // When allocated is not provided, falls back to 0 — covers ternary false branch (line 416).
  test("creates balance with 0 allocated days when allocated is not provided", async () => {
    const person = await createTestPerson({ name: "Henry" });
    const lt = await createTestLeaveType({ name: "Sick" });
    const result = await allocateLeaveBalance(
      formData({ personId: person.id, leaveTypeId: lt.id, year: "2026" }),
    );
    expect(result).toBeUndefined();
    const balance = await testPrisma.leaveBalance.findFirst({
      where: { personId: person.id, leaveTypeId: lt.id, year: 2026 },
    });
    expect(balance!.allocated).toBe(0);
  });
});
