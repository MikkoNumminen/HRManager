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
  revalidateTag: jest.fn(),
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
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

// ─── updateLeaveType ─────────────────────────────────────────

describe("updateLeaveType", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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

  // Rejects duplicate name on update.
  test("rejects duplicate name on update", async () => {
    await createTestLeaveType({ name: "Annual" });
    const lt2 = await createTestLeaveType({ name: "Sick" });
    const result = await updateLeaveType(
      formData({ id: lt2.id, name: "Annual", defaultDays: "5", color: "#000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

// ─── deleteLeaveType ─────────────────────────────────────────

describe("deleteLeaveType", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

// ─── createLeaveRequest ──────────────────────────────────────

describe("createLeaveRequest", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

// ─── reviewLeaveRequest ──────────────────────────────────────

describe("reviewLeaveRequest", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});

// ─── deleteLeaveRequest ──────────────────────────────────────

describe("deleteLeaveRequest", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

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
});
