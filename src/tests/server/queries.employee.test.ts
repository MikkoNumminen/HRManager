import { testPrisma, cleanDb } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock next-auth — ESM imports can't be parsed by Jest in CJS mode
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock demo session — defaults to null (production/no-demo mode)
const mockGetDemoSessionId = jest.fn().mockResolvedValue(null);
jest.mock("@/demoSession", () => ({
  getDemoSessionId: () => mockGetDemoSessionId(),
}));

import {
  getLinkedPerson,
  getSelfProfile,
  getSelfLeaveRequests,
  getSelfLeaveBalances,
  getSelfReviews,
} from "@/features/employee/queries";

const { auth } = require("@/auth");

// Helper: mock the authenticated user's email
function mockAuthUser(email: string | null) {
  auth.mockResolvedValue(email ? { user: { email, id: "user-id-1" } } : null);
}

beforeEach(async () => {
  await cleanDb();
  mockGetDemoSessionId.mockResolvedValue(null);
}, 30_000);

afterAll(() => cleanDb(), 30_000);

// ─────────────────────────────────────────────────────────────────────────────
// getLinkedPerson
// ─────────────────────────────────────────────────────────────────────────────

describe("getLinkedPerson", () => {
  // Returns null when the user is not authenticated (no session).
  test("returns null when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const result = await getLinkedPerson();
    expect(result).toBeNull();
  });

  // Returns null when no Person record exists with the user's email.
  test("returns null when no matching Person exists", async () => {
    mockAuthUser("unknown@example.com");
    const result = await getLinkedPerson();
    expect(result).toBeNull();
  });

  // Returns the Person when a record with the matching email exists.
  test("returns the linked person by email match", async () => {
    await testPrisma.person.create({ data: { name: "Alice", email: "alice@example.com" } });
    mockAuthUser("alice@example.com");
    const result = await getLinkedPerson();
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Alice");
  });

  // IDOR: User B's email does not return User A's Person record.
  test("IDOR: does not return another user's person", async () => {
    await testPrisma.person.create({ data: { name: "Alice", email: "alice@example.com" } });
    mockAuthUser("bob@example.com");
    const result = await getLinkedPerson();
    expect(result).toBeNull();
  });

  // Soft-deleted persons must not appear even if the email matches.
  test("ignores soft-deleted persons", async () => {
    await testPrisma.person.create({
      data: { name: "Deleted", email: "deleted@example.com", deletedAt: new Date() },
    });
    mockAuthUser("deleted@example.com");
    const result = await getLinkedPerson();
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSelfProfile
// ─────────────────────────────────────────────────────────────────────────────

describe("getSelfProfile", () => {
  // Returns null when the user is unauthenticated.
  test("returns null when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const result = await getSelfProfile();
    expect(result).toBeNull();
  });

  // Returns null when the authenticated user has no linked Person record.
  test("returns null when no person is linked", async () => {
    mockAuthUser("nobody@example.com");
    const result = await getSelfProfile();
    expect(result).toBeNull();
  });

  // Returns an EmployeeProfile when the user's email matches a Person record.
  test("returns EmployeeProfile for linked person", async () => {
    await testPrisma.person.create({
      data: { name: "Bob", email: "bob@example.com", position: "Engineer" },
    });
    mockAuthUser("bob@example.com");
    const result = await getSelfProfile();
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Bob");
    expect(result!.position).toBe("Engineer");
    expect(result!.email).toBe("bob@example.com");
  });

  // IDOR: cannot view someone else's profile by manipulating state — only the caller's own email is used.
  test("IDOR: only returns own profile, not another person's", async () => {
    await testPrisma.person.create({ data: { name: "Alice", email: "alice@example.com" } });
    await testPrisma.person.create({ data: { name: "Bob", email: "bob@example.com" } });
    mockAuthUser("bob@example.com");
    const result = await getSelfProfile();
    expect(result!.name).toBe("Bob");
    expect(result!.name).not.toBe("Alice");
  });

  // Teams, managedTeams, and headOfDepartments are included in the profile.
  test("includes teams and leadership roles", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Carol", email: "carol@example.com" },
    });
    const dept = await testPrisma.department.create({
      data: { name: "Engineering", headId: person.id },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Alpha", teamManagerId: person.id },
    });
    await testPrisma.teamMember.create({ data: { personId: person.id, teamId: team.teamId } });

    mockAuthUser("carol@example.com");
    const result = await getSelfProfile();
    expect(result).not.toBeNull();
    expect(result!.teams.length).toBeGreaterThan(0);
    expect(result!.managedTeams.length).toBeGreaterThan(0);
    expect(result!.headOfDepartments.length).toBeGreaterThan(0);

    // Avoid unused variable warning
    expect(dept.name).toBe("Engineering");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSelfLeaveRequests
// ─────────────────────────────────────────────────────────────────────────────

describe("getSelfLeaveRequests", () => {
  // Returns empty array when user is not authenticated.
  test("returns empty array when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const result = await getSelfLeaveRequests();
    expect(result).toEqual([]);
  });

  // Returns empty array when no person is linked to the user's email.
  test("returns empty array when no person is linked", async () => {
    mockAuthUser("nobody@example.com");
    const result = await getSelfLeaveRequests();
    expect(result).toEqual([]);
  });

  // Returns only the authenticated user's own leave requests.
  test("returns own leave requests", async () => {
    const personA = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@example.com" },
    });
    const personB = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@example.com" },
    });
    const leaveType = await testPrisma.leaveType.create({
      data: { name: "Annual", defaultDays: 20, color: "#00ff00" },
    });

    // Alice's leave request
    await testPrisma.leaveRequest.create({
      data: {
        personId: personA.id,
        leaveTypeId: leaveType.id,
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-05"),
        days: 5,
        status: "PENDING",
      },
    });

    // Bob's leave request — should NOT appear in Alice's results
    await testPrisma.leaveRequest.create({
      data: {
        personId: personB.id,
        leaveTypeId: leaveType.id,
        startDate: new Date("2025-08-01"),
        endDate: new Date("2025-08-03"),
        days: 3,
        status: "APPROVED",
      },
    });

    mockAuthUser("alice@example.com");
    const result = await getSelfLeaveRequests();
    expect(result).toHaveLength(1);
    expect(result[0].personId).toBe(personA.id);
  });

  // IDOR: Alice calling getSelfLeaveRequests never sees Bob's requests.
  test("IDOR: cannot see another person's leave requests", async () => {
    const personB = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@example.com" },
    });
    const leaveType = await testPrisma.leaveType.create({
      data: { name: "Sick", defaultDays: 10, color: "#ff0000" },
    });
    await testPrisma.leaveRequest.create({
      data: {
        personId: personB.id,
        leaveTypeId: leaveType.id,
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-06-02"),
        days: 2,
        status: "APPROVED",
      },
    });

    // Alice is authenticated — she should not see Bob's requests
    await testPrisma.person.create({ data: { name: "Alice", email: "alice@example.com" } });
    mockAuthUser("alice@example.com");
    const result = await getSelfLeaveRequests();
    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSelfLeaveBalances
// ─────────────────────────────────────────────────────────────────────────────

describe("getSelfLeaveBalances", () => {
  // Returns empty array when not authenticated.
  test("returns empty array when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const result = await getSelfLeaveBalances();
    expect(result).toEqual([]);
  });

  // Returns own leave balances filtered to the authenticated user's Person.
  test("returns own leave balances", async () => {
    const personA = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@example.com" },
    });
    const personB = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@example.com" },
    });
    const leaveType = await testPrisma.leaveType.create({
      data: { name: "Annual", defaultDays: 20, color: "#00ff00" },
    });

    await testPrisma.leaveBalance.create({
      data: { personId: personA.id, leaveTypeId: leaveType.id, year: 2025, allocated: 20, used: 5 },
    });
    await testPrisma.leaveBalance.create({
      data: { personId: personB.id, leaveTypeId: leaveType.id, year: 2025, allocated: 15, used: 0 },
    });

    mockAuthUser("alice@example.com");
    const result = await getSelfLeaveBalances(2025);
    expect(result).toHaveLength(1);
    expect(result[0].personId).toBe(personA.id);
    expect(result[0].allocated).toBe(20);
    expect(result[0].remaining).toBe(15);
  });

  // IDOR: Alice cannot see Bob's leave balances.
  test("IDOR: cannot see another person's leave balances", async () => {
    const personB = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@example.com" },
    });
    const leaveType = await testPrisma.leaveType.create({
      data: { name: "Sick", defaultDays: 10, color: "#ff0000" },
    });
    await testPrisma.leaveBalance.create({
      data: { personId: personB.id, leaveTypeId: leaveType.id, year: 2025, allocated: 10, used: 2 },
    });

    await testPrisma.person.create({ data: { name: "Alice", email: "alice@example.com" } });
    mockAuthUser("alice@example.com");
    const result = await getSelfLeaveBalances(2025);
    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSelfReviews
// ─────────────────────────────────────────────────────────────────────────────

describe("getSelfReviews", () => {
  // Returns empty array when not authenticated.
  test("returns empty array when not authenticated", async () => {
    auth.mockResolvedValue(null);
    const result = await getSelfReviews();
    expect(result).toEqual([]);
  });

  // Returns empty array when no person is linked.
  test("returns empty array when no person is linked", async () => {
    mockAuthUser("nobody@example.com");
    const result = await getSelfReviews();
    expect(result).toEqual([]);
  });

  // Returns only review requests where the authenticated user's person is the subject.
  test("returns own review requests as subject", async () => {
    const personA = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@example.com" },
    });
    const personB = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@example.com" },
    });
    const template = await testPrisma.reviewTemplate.create({
      data: { name: "Q1 Review", questions: [] },
    });
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Q1 2025",
        templateId: template.id,
        status: "OPEN",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-03-31"),
      },
    });

    // Alice's review — she is the subject
    await testPrisma.reviewRequest.create({
      data: {
        cycleId: cycle.id,
        subjectId: personA.id,
        reviewerId: personB.id,
        type: "MANAGER",
        status: "PENDING",
      },
    });

    // Bob's review — he is the subject, not Alice
    await testPrisma.reviewRequest.create({
      data: {
        cycleId: cycle.id,
        subjectId: personB.id,
        reviewerId: personA.id,
        type: "PEER",
        status: "SUBMITTED",
      },
    });

    mockAuthUser("alice@example.com");
    const result = await getSelfReviews();
    expect(result).toHaveLength(1);
    expect(result[0].subjectId).toBe(personA.id);
  });

  // IDOR: Alice cannot see Bob's review requests where Bob is the subject.
  test("IDOR: cannot see another person's reviews", async () => {
    const personB = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@example.com" },
    });
    const template = await testPrisma.reviewTemplate.create({
      data: { name: "Annual", questions: [] },
    });
    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Annual 2025",
        templateId: template.id,
        status: "CLOSED",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
      },
    });
    await testPrisma.reviewRequest.create({
      data: { cycleId: cycle.id, subjectId: personB.id, type: "SELF", status: "SUBMITTED" },
    });

    await testPrisma.person.create({ data: { name: "Alice", email: "alice@example.com" } });
    mockAuthUser("alice@example.com");
    const result = await getSelfReviews();
    expect(result).toHaveLength(0);
  });
});
