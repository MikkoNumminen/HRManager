import { testPrisma, cleanDb } from "./testDb";
import {
  setupTestMongo,
  teardownTestMongo,
  cleanTestMongo,
  getTestAuditLogCollection,
} from "./testMongoDb";
import type { AuditLogDocument } from "@/mongoDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock @/mongoDb to use the in-memory test MongoDB collection via globalThis
jest.mock("@/mongoDb", () => ({
  getAuditLogCollection: () => (globalThis as Record<string, unknown>).__testAuditLogCollection,
  isMongoAvailable: () => true,
}));

// Mock next-auth — it uses ESM imports that Jest can't parse in CJS mode.
// The auth module is imported transitively via permissions.ts → auth.ts → next-auth.
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock permissions — hasPermission is used in audit log queries.
// We allow all permissions so query tests focus on data logic.
jest.mock("@/permissions", () => ({
  ...jest.requireActual("@/permissions"),
  hasPermission: jest.fn(() => true),
}));

// Mock demo session — defaults to null (production mode).
// Individual tests override mockGetDemoSessionId to simulate demo sessions.
const mockGetDemoSessionId = jest.fn().mockResolvedValue(null);
jest.mock("@/demoSession", () => ({
  getDemoSessionId: () => mockGetDemoSessionId(),
}));

import {
  getPersons,
  getPagedPersons,
  getTeams,
  getPagedTeams,
  getDepartments,
  getPagedDepartments,
  getUsers,
  getUserById,
  getAllPermissionKeys,
  getAuditLogs,
  getAuditLogUserEmails,
  getDashboardMetrics,
  getDataExportCounts,
  getProfile,
  getPersonDeleteImpact,
  getTeamDeleteImpact,
  getDepartmentDeleteImpact,
  getLeaveRequests,
  getLeaveBalances,
} from "@/queries";

const { auth } = require("@/auth");

/** Helper to insert an audit log document into the test MongoDB collection. */
async function insertTestAuditLog(
  data: Partial<AuditLogDocument> & { action: string; entityType: string },
) {
  await getTestAuditLogCollection().insertOne({
    userId: data.userId ?? null,
    userEmail: data.userEmail ?? null,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId ?? null,
    before: data.before ?? null,
    after: data.after ?? null,
    sessionId: data.sessionId ?? null,
    createdAt: data.createdAt ?? new Date(),
  });
}

beforeAll(async () => {
  await setupTestMongo();
  (globalThis as Record<string, unknown>).__testAuditLogCollection = getTestAuditLogCollection();
});

afterAll(async () => {
  await teardownTestMongo();
});

describe("getPersons", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(() => cleanDb());

  // An empty database should give back an empty list, not an error.
  test("returns empty array when no persons exist", async () => {
    const result = await getPersons();
    expect(result).toEqual([]);
  });

  // Put two people in, get two people out. Simple as that.
  test("returns all persons from the database", async () => {
    await testPrisma.person.create({
      data: { name: "Alice", email: "alice@example.com" },
    });
    await testPrisma.person.create({
      data: { name: "Bob", email: "bob@example.com", position: "Developer" },
    });

    const result = await getPersons();
    expect(result).toHaveLength(2);

    const names = result.map((p) => p.name).sort();
    expect(names).toEqual(["Alice", "Bob"]);
  });

  // Make sure every field comes back as the right type — strings are strings,
  // dates are dates. This catches sneaky bugs where the DB returns something unexpected.
  test("returns persons with correct field types", async () => {
    await testPrisma.person.create({
      data: { name: "Charlie", email: "charlie@example.com", position: "Manager" },
    });

    const [person] = await getPersons();
    expect(typeof person.id).toBe("string");
    expect(typeof person.name).toBe("string");
    expect(typeof person.position).toBe("string");
    expect(typeof person.email).toBe("string");
    expect(person.createdAt).toBeInstanceOf(Date);
    expect(person.updatedAt).toBeInstanceOf(Date);
  });

  // Position and email are optional in the database. If they weren't filled in,
  // they should come back as null — not undefined, not empty string.
  test("returns null for missing position and email", async () => {
    await testPrisma.person.create({
      data: { name: "NoFields" },
    });

    const [person] = await getPersons();
    expect(person.name).toBe("NoFields");
    expect(person.position).toBeNull();
    expect(person.email).toBeNull();
  });
});

describe("getTeams", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(() => cleanDb());

  // No teams in the database? You get an empty list, not a crash.
  test("returns empty array when no teams exist", async () => {
    const result = await getTeams();
    expect(result).toEqual([]);
  });

  // A team without a manager should show null for both the manager ID and name.
  // This is the default state when you first create a team.
  test("returns team with null manager when no manager assigned", async () => {
    await testPrisma.team.create({
      data: { teamName: "No Manager Team" },
    });

    const [team] = await getTeams();
    expect(team.teamName).toBe("No Manager Team");
    expect(team.teamManagerId).toBeNull();
    expect(team.managerName).toBeNull();
  });

  // When a team has a manager, we should get both the manager's ID
  // and their actual name — so the UI can display "Managed by Team Lead".
  test("returns team with manager details", async () => {
    const manager = await testPrisma.person.create({
      data: { name: "Team Lead", email: "lead@example.com" },
    });
    await testPrisma.team.create({
      data: { teamName: "Dev Team", teamManagerId: manager.id },
    });

    const [team] = await getTeams();
    expect(team.teamName).toBe("Dev Team");
    expect(team.teamManagerId).toBe(manager.id);
    expect(team.managerName).toBe("Team Lead");
  });

  // A team with no members should have an empty array, not null or undefined.
  // The UI relies on being able to call .map() on this without crashing.
  test("returns team with empty members array when no members", async () => {
    await testPrisma.team.create({
      data: { teamName: "Empty Team" },
    });

    const [team] = await getTeams();
    expect(team.members).toEqual([]);
  });

  // Each member should come back with their personId, name, and email.
  // This is the shape the frontend components expect to render the member list.
  test("returns team members with correct shape", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Member One", email: "member@example.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Full Team" },
    });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    const [result] = await getTeams();
    expect(result.members).toHaveLength(1);
    expect(result.members[0]).toEqual({
      personId: person.id,
      name: "Member One",
      email: "member@example.com",
    });
  });

  // If a team member never provided an email, it should be null in the output.
  test("returns member with null email", async () => {
    const person = await testPrisma.person.create({
      data: { name: "No Email" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team X" },
    });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    const [result] = await getTeams();
    expect(result.members[0].email).toBeNull();
  });

  // The real-world scenario: multiple teams, people in multiple teams.
  // Person A is in both teams, Person B is only in Alpha. Counts should match.
  test("returns multiple teams with multiple members", async () => {
    const p1 = await testPrisma.person.create({
      data: { name: "Person A", email: "a@example.com" },
    });
    const p2 = await testPrisma.person.create({
      data: { name: "Person B", email: "b@example.com" },
    });
    const t1 = await testPrisma.team.create({
      data: { teamName: "Team Alpha" },
    });
    const t2 = await testPrisma.team.create({
      data: { teamName: "Team Beta" },
    });
    await testPrisma.teamMember.create({
      data: { personId: p1.id, teamId: t1.teamId },
    });
    await testPrisma.teamMember.create({
      data: { personId: p2.id, teamId: t1.teamId },
    });
    await testPrisma.teamMember.create({
      data: { personId: p1.id, teamId: t2.teamId },
    });

    const teams = await getTeams();
    expect(teams).toHaveLength(2);

    const alpha = teams.find((t) => t.teamName === "Team Alpha")!;
    const beta = teams.find((t) => t.teamName === "Team Beta")!;
    expect(alpha.members).toHaveLength(2);
    expect(beta.members).toHaveLength(1);
  });

  // Double-check that every field on a team object is the right type.
  // Catches issues where the database returns something the schema doesn't expect.
  test("returns correct field types on team", async () => {
    await testPrisma.team.create({
      data: { teamName: "Type Check Team" },
    });

    const [team] = await getTeams();
    expect(typeof team.teamId).toBe("string");
    expect(typeof team.teamName).toBe("string");
    expect(team.createdAt).toBeInstanceOf(Date);
    expect(team.updatedAt).toBeInstanceOf(Date);
    expect(Array.isArray(team.members)).toBe(true);
  });
});

describe("getUsers", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(() => cleanDb());

  // An empty user table should return an empty list.
  test("returns empty array when no users exist", async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  // Add two users and verify both come back with correct data.
  test("returns all users from the database", async () => {
    await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "administrator" },
    });
    await testPrisma.user.create({
      data: { email: "bob@test.com", name: "Bob", role: "user" },
    });

    const result = await getUsers();
    expect(result).toHaveLength(2);
    const emails = result.map((u) => u.email).sort();
    expect(emails).toEqual(["alice@test.com", "bob@test.com"]);
  });

  // Users should come back sorted by createdAt (earliest first).
  test("returns users ordered by creation date", async () => {
    await testPrisma.user.create({
      data: { email: "second@test.com", name: "Second", role: "user" },
    });
    await testPrisma.user.create({
      data: { email: "first@test.com", name: "First", role: "superuser" },
    });

    const result = await getUsers();
    expect(result[0].email).toBe("second@test.com");
    expect(result[1].email).toBe("first@test.com");
  });

  // Check that every field has the right type after Zod parsing.
  test("returns users with correct field types", async () => {
    await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });

    const [user] = await getUsers();
    expect(typeof user.id).toBe("string");
    expect(typeof user.email).toBe("string");
    expect(typeof user.role).toBe("string");
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  // Name and image are nullable — OAuth doesn't always provide them.
  test("returns null for missing name and image", async () => {
    await testPrisma.user.create({
      data: { email: "anon@test.com", role: "user" },
    });

    const [user] = await getUsers();
    expect(user.name).toBeNull();
    expect(user.image).toBeNull();
  });

  // Demo sessions only see the demo user — prevents leaking real OAuth user emails.
  test("filters to only demo user in demo session", async () => {
    mockGetDemoSessionId.mockResolvedValueOnce("demo-sess-123");
    await testPrisma.user.create({
      data: { email: "demo@hrmanager.app", name: "Demo", role: "superuser" },
    });
    await testPrisma.user.create({
      data: { email: "real@oauth.com", name: "Real User", role: "administrator" },
    });

    const result = await getUsers();
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("demo@hrmanager.app");
  });
});

describe("getUserById", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(() => cleanDb());

  // Look up a user by ID and get back their data plus resolved permissions.
  test("returns user with overrides and resolved permissions", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });

    const result = await getUserById(user.id);
    expect(result).not.toBeNull();
    expect(result!.email).toBe("alice@test.com");
    expect(result!.overrides).toEqual([]);
    expect(result!.resolvedPermissions).toBeDefined();
    expect(typeof result!.resolvedPermissions["person:read"]).toBe("boolean");
  });

  // A user with permission overrides should have them listed.
  test("includes permission overrides", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    const perm = await testPrisma.permission.create({
      data: { key: "person:create", description: "Create persons" },
    });
    await testPrisma.userPermission.create({
      data: { userId: user.id, permissionId: perm.id, granted: true },
    });

    const result = await getUserById(user.id);
    expect(result!.overrides).toHaveLength(1);
    expect(result!.overrides[0]).toEqual({ key: "person:create", granted: true });
  });

  // Looking up a non-existent user should return null, not crash.
  test("returns null for non-existent user", async () => {
    const result = await getUserById("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    expect(result).toBeNull();
  });

  // Demo sessions can't view real OAuth users by guessing UUIDs — privacy protection.
  test("returns null for non-demo user in demo session", async () => {
    mockGetDemoSessionId.mockResolvedValueOnce("demo-sess-123");
    const realUser = await testPrisma.user.create({
      data: { email: "real@oauth.com", name: "Real", role: "administrator" },
    });

    const result = await getUserById(realUser.id);
    expect(result).toBeNull();
  });

  // Demo sessions can view the demo user's own data.
  test("returns demo user in demo session", async () => {
    mockGetDemoSessionId.mockResolvedValueOnce("demo-sess-123");
    const demoUser = await testPrisma.user.create({
      data: { email: "demo@hrmanager.app", name: "Demo", role: "superuser" },
    });

    const result = await getUserById(demoUser.id);
    expect(result).not.toBeNull();
    expect(result!.email).toBe("demo@hrmanager.app");
  });
});

describe("getAllPermissionKeys", () => {
  // Should return all 34 permission keys defined in the system.
  test("returns all 34 permission keys", async () => {
    const keys = await getAllPermissionKeys();
    expect(keys).toHaveLength(34);
    expect(keys).toContain("person:create");
    expect(keys).toContain("department:create");
    expect(keys).toContain("admin:manage_users");
  });

  // The returned array should be a copy, not a reference to the original.
  test("returns a new array (not the original reference)", async () => {
    const keys1 = await getAllPermissionKeys();
    const keys2 = await getAllPermissionKeys();
    expect(keys1).not.toBe(keys2);
    expect(keys1).toEqual(keys2);
  });
});

describe("getAuditLogs", () => {
  beforeEach(async () => {
    await cleanDb();
    await cleanTestMongo();
  });

  // Returns empty result when no audit logs exist.
  test("returns empty array when no logs exist", async () => {
    const result = await getAuditLogs();
    expect(result.logs).toEqual([]);
    expect(result.total).toBe(0);
  });

  // Returns logs in descending order by createdAt (newest first).
  test("returns logs in descending order", async () => {
    await insertTestAuditLog({
      action: "create",
      entityType: "person",
      userEmail: "alice@example.com",
      createdAt: new Date("2026-01-01"),
    });
    await insertTestAuditLog({
      action: "update",
      entityType: "person",
      userEmail: "bob@example.com",
      createdAt: new Date("2026-02-01"),
    });
    const result = await getAuditLogs();
    expect(result.logs).toHaveLength(2);
    expect(result.logs[0].action).toBe("update");
    expect(result.logs[1].action).toBe("create");
  });

  // Filters logs by userEmail.
  test("filters by userEmail", async () => {
    await insertTestAuditLog({
      action: "create",
      entityType: "person",
      userEmail: "alice@example.com",
    });
    await insertTestAuditLog({
      action: "delete",
      entityType: "person",
      userEmail: "bob@example.com",
    });
    const result = await getAuditLogs({ userEmail: "alice" });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].userEmail).toBe("alice@example.com");
    expect(result.total).toBe(1);
  });

  // Filters logs by action type.
  test("filters by action", async () => {
    await insertTestAuditLog({
      action: "create",
      entityType: "person",
      userEmail: "a@b.com",
    });
    await insertTestAuditLog({
      action: "delete",
      entityType: "person",
      userEmail: "a@b.com",
    });
    const result = await getAuditLogs({ action: "delete" });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].action).toBe("delete");
  });

  // Filters logs by entity type.
  test("filters by entityType", async () => {
    await insertTestAuditLog({
      action: "create",
      entityType: "person",
      userEmail: "a@b.com",
    });
    await insertTestAuditLog({
      action: "create",
      entityType: "team",
      userEmail: "a@b.com",
    });
    const result = await getAuditLogs({ entityType: "team" });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].entityType).toBe("team");
  });

  // Paginates correctly — page 1 vs page 2 return different results.
  test("paginates correctly", async () => {
    for (let i = 0; i < 5; i++) {
      await insertTestAuditLog({
        action: "create",
        entityType: "person",
        userEmail: `user${i}@example.com`,
      });
    }
    const page1 = await getAuditLogs({ page: 1, pageSize: 2 });
    const page2 = await getAuditLogs({ page: 2, pageSize: 2 });
    expect(page1.logs).toHaveLength(2);
    expect(page2.logs).toHaveLength(2);
    expect(page1.total).toBe(5);
    expect(page1.logs[0].id).not.toBe(page2.logs[0].id);
  });

  // Filters logs by date range when dateFrom and dateTo are provided.
  test("filters by date range", async () => {
    const old = new Date("2025-01-01T00:00:00Z");
    const mid = new Date("2025-06-15T00:00:00Z");
    const recent = new Date("2025-12-01T00:00:00Z");
    await insertTestAuditLog({
      action: "create",
      entityType: "person",
      userEmail: "a@b.com",
      createdAt: old,
    });
    await insertTestAuditLog({
      action: "update",
      entityType: "person",
      userEmail: "a@b.com",
      createdAt: mid,
    });
    await insertTestAuditLog({
      action: "delete",
      entityType: "person",
      userEmail: "a@b.com",
      createdAt: recent,
    });
    const result = await getAuditLogs({
      dateFrom: new Date("2025-03-01"),
      dateTo: new Date("2025-09-01"),
    });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].action).toBe("update");
    expect(result.total).toBe(1);
  });

  // Returns correct total count even when paginated.
  test("returns correct total with filters and pagination", async () => {
    for (let i = 0; i < 3; i++) {
      await insertTestAuditLog({
        action: "create",
        entityType: "person",
        userEmail: "a@b.com",
      });
    }
    await insertTestAuditLog({
      action: "delete",
      entityType: "person",
      userEmail: "a@b.com",
    });
    const result = await getAuditLogs({ action: "create", page: 1, pageSize: 2 });
    expect(result.logs).toHaveLength(2);
    expect(result.total).toBe(3);
  });

  // Filters by multiple criteria simultaneously (action + entityType).
  test("filters by action AND entityType together", async () => {
    for (const d of [
      { action: "create", entityType: "person" },
      { action: "create", entityType: "team" },
      { action: "update", entityType: "person" },
      { action: "update", entityType: "team" },
    ] as const) {
      await insertTestAuditLog(d);
    }

    const result = await getAuditLogs({ action: "create", entityType: "person" });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].action).toBe("create");
    expect(result.logs[0].entityType).toBe("person");
  });

  // Filters by date range using ISO string format (dateFrom + dateTo).
  test("filters by date range with ISO strings", async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const twoDaysAgo = new Date(now.getTime() - 172800000);

    await insertTestAuditLog({
      action: "create",
      entityType: "person",
      createdAt: twoDaysAgo,
    });
    await insertTestAuditLog({
      action: "update",
      entityType: "person",
      createdAt: yesterday,
    });
    await insertTestAuditLog({
      action: "delete",
      entityType: "person",
      createdAt: now,
    });

    const result = await getAuditLogs({
      dateFrom: yesterday,
      dateTo: now,
    });
    // Should include yesterday and today entries, but not two days ago
    expect(result.logs.length).toBeGreaterThanOrEqual(2);
    expect(result.logs.every((l) => new Date(l.createdAt) >= yesterday)).toBe(true);
  });

  // Filters by all criteria at once (action + entityType + userEmail + dateRange).
  test("filters by all criteria simultaneously", async () => {
    const now = new Date();
    await insertTestAuditLog({
      action: "create",
      entityType: "person",
      userId: "u1",
      userEmail: "alice@test.com",
      createdAt: now,
    });
    await insertTestAuditLog({
      action: "create",
      entityType: "person",
      userId: "u2",
      userEmail: "bob@test.com",
      createdAt: now,
    });
    await insertTestAuditLog({
      action: "update",
      entityType: "person",
      userId: "u1",
      userEmail: "alice@test.com",
      createdAt: now,
    });
    await insertTestAuditLog({
      action: "create",
      entityType: "team",
      userId: "u1",
      userEmail: "alice@test.com",
      createdAt: now,
    });

    const result = await getAuditLogs({
      action: "create",
      entityType: "person",
      userEmail: "alice@test.com",
    });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].userEmail).toBe("alice@test.com");
    expect(result.logs[0].action).toBe("create");
    expect(result.logs[0].entityType).toBe("person");
  });
});

describe("getAuditLogUserEmails", () => {
  beforeEach(async () => {
    await cleanDb();
    await cleanTestMongo();
  });

  // Returns empty array when no logs exist.
  test("returns empty array when no logs exist", async () => {
    const result = await getAuditLogUserEmails();
    expect(result).toEqual([]);
  });

  // Returns distinct emails only — no duplicates.
  test("returns distinct emails", async () => {
    await insertTestAuditLog({
      action: "create",
      entityType: "person",
      userEmail: "alice@example.com",
    });
    await insertTestAuditLog({
      action: "update",
      entityType: "person",
      userEmail: "alice@example.com",
    });
    await insertTestAuditLog({
      action: "delete",
      entityType: "person",
      userEmail: "bob@example.com",
    });
    const result = await getAuditLogUserEmails();
    expect(result).toEqual(["alice@example.com", "bob@example.com"]);
  });

  // Excludes null emails (system/anonymous actions).
  test("excludes null emails", async () => {
    await insertTestAuditLog({
      action: "create",
      entityType: "person",
      userEmail: null,
    });
    await insertTestAuditLog({
      action: "create",
      entityType: "person",
      userEmail: "alice@example.com",
    });
    const result = await getAuditLogUserEmails();
    expect(result).toEqual(["alice@example.com"]);
  });
});

describe("getDepartments", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
  });

  // Returns an empty array when no departments exist.
  test("returns empty array when no departments exist", async () => {
    const result = await getDepartments();
    expect(result).toEqual([]);
  });

  // Returns all departments with correct fields.
  test("returns departments with correct field types", async () => {
    await testPrisma.department.create({
      data: { name: "Engineering", description: "Dev team" },
    });
    const result = await getDepartments();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Engineering");
    expect(result[0].description).toBe("Dev team");
    expect(result[0].headId).toBeNull();
    expect(result[0].headName).toBeNull();
    expect(result[0].teams).toEqual([]);
    expect(result[0].id).toBeDefined();
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].updatedAt).toBeInstanceOf(Date);
  });

  // Returns the head person's name when a head is assigned.
  test("includes head name when head is assigned", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await testPrisma.department.create({
      data: { name: "Product", headId: person.id },
    });
    const result = await getDepartments();
    expect(result[0].headName).toBe("Alice");
    expect(result[0].headId).toBe(person.id);
  });

  // Returns teams that belong to the department.
  test("includes teams assigned to the department", async () => {
    const dept = await testPrisma.department.create({
      data: { name: "Engineering" },
    });
    await testPrisma.team.create({
      data: { teamName: "Platform", departmentId: dept.id },
    });
    await testPrisma.team.create({
      data: { teamName: "Frontend", departmentId: dept.id },
    });
    const result = await getDepartments();
    expect(result[0].teams).toHaveLength(2);
    expect(result[0].teams.map((t) => t.teamName).sort()).toEqual(["Frontend", "Platform"]);
  });

  // Department with null description returns null.
  test("returns null description when not set", async () => {
    await testPrisma.department.create({ data: { name: "Ops" } });
    const result = await getDepartments();
    expect(result[0].description).toBeNull();
  });
});

describe("getDashboardMetrics", () => {
  beforeEach(async () => {
    await cleanDb();
    await cleanTestMongo();
  });

  // Returns zero counts when the database is empty.
  test("returns zero counts when database is empty", async () => {
    const metrics = await getDashboardMetrics();
    expect(metrics.totalPersons).toBe(0);
    expect(metrics.totalTeams).toBe(0);
    expect(metrics.totalDepartments).toBe(0);
    expect(metrics.totalUsers).toBe(0);
    expect(metrics.teamSizes).toEqual([]);
    expect(metrics.departmentSizes).toEqual([]);
    expect(metrics.growthTimeline).toEqual([]);
    expect(metrics.recentActivity).toEqual([]);
  });

  // Returns correct counts for persons, teams, departments, and users.
  test("returns correct entity counts", async () => {
    await testPrisma.person.createMany({
      data: [
        { name: "Alice", email: "a@test.com" },
        { name: "Bob", email: "b@test.com" },
        { name: "Charlie", email: "c@test.com" },
      ],
    });
    await testPrisma.team.createMany({
      data: [{ teamName: "Alpha" }, { teamName: "Beta" }],
    });
    await testPrisma.department.create({ data: { name: "Engineering" } });
    await testPrisma.user.createMany({
      data: [
        { email: "u1@test.com", name: "U1", role: "user" },
        { email: "u2@test.com", name: "U2", role: "administrator" },
      ],
    });

    const metrics = await getDashboardMetrics();
    expect(metrics.totalPersons).toBe(3);
    expect(metrics.totalTeams).toBe(2);
    expect(metrics.totalDepartments).toBe(1);
    expect(metrics.totalUsers).toBe(2);
  });

  // Returns team member counts sorted by team name.
  test("returns team sizes with member counts", async () => {
    const person1 = await testPrisma.person.create({
      data: { name: "Alice", email: "a@test.com" },
    });
    const person2 = await testPrisma.person.create({
      data: { name: "Bob", email: "b@test.com" },
    });
    const team = await testPrisma.team.create({ data: { teamName: "Alpha" } });
    await testPrisma.teamMember.createMany({
      data: [
        { personId: person1.id, teamId: team.teamId },
        { personId: person2.id, teamId: team.teamId },
      ],
    });
    await testPrisma.team.create({ data: { teamName: "Beta" } });

    const metrics = await getDashboardMetrics();
    expect(metrics.teamSizes).toEqual([
      { teamName: "Alpha", memberCount: 2 },
      { teamName: "Beta", memberCount: 0 },
    ]);
  });

  // Returns department team counts sorted by department name.
  test("returns department sizes with team counts", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Engineering" } });
    await testPrisma.team.create({ data: { teamName: "Platform", departmentId: dept.id } });
    await testPrisma.team.create({ data: { teamName: "Frontend", departmentId: dept.id } });
    await testPrisma.department.create({ data: { name: "Marketing" } });

    const metrics = await getDashboardMetrics();
    expect(metrics.departmentSizes).toEqual([
      { departmentName: "Engineering", teamCount: 2 },
      { departmentName: "Marketing", teamCount: 0 },
    ]);
  });

  // Returns cumulative growth timeline grouped by creation date.
  test("returns cumulative growth timeline", async () => {
    await testPrisma.person.create({
      data: { name: "A", email: "a@test.com", createdAt: new Date("2026-01-15T10:00:00Z") },
    });
    await testPrisma.person.create({
      data: { name: "B", email: "b@test.com", createdAt: new Date("2026-01-15T14:00:00Z") },
    });
    await testPrisma.person.create({
      data: { name: "C", email: "c@test.com", createdAt: new Date("2026-02-10T10:00:00Z") },
    });
    await testPrisma.team.create({
      data: { teamName: "Alpha", createdAt: new Date("2026-01-15T10:00:00Z") },
    });
    await testPrisma.department.create({
      data: { name: "Eng", createdAt: new Date("2026-02-10T10:00:00Z") },
    });

    const metrics = await getDashboardMetrics();
    expect(metrics.growthTimeline).toHaveLength(2);
    expect(metrics.growthTimeline[0]).toEqual({
      date: "2026-01-15",
      persons: 2,
      teams: 1,
      departments: 0,
    });
    expect(metrics.growthTimeline[1]).toEqual({
      date: "2026-02-10",
      persons: 3,
      teams: 1,
      departments: 1,
    });
  });

  // Returns recent audit log activity (max 10 entries, newest first).
  test("returns recent activity from audit log", async () => {
    for (let i = 0; i < 12; i++) {
      await insertTestAuditLog({
        action: "create",
        entityType: "person",
        userEmail: `user${i}@test.com`,
        createdAt: new Date(`2026-03-${String(i + 1).padStart(2, "0")}`),
      });
    }

    const metrics = await getDashboardMetrics();
    expect(metrics.recentActivity).toHaveLength(10);
    // Newest first
    expect(metrics.recentActivity[0].userEmail).toBe("user11@test.com");
    expect(metrics.recentActivity[9].userEmail).toBe("user2@test.com");
  });

  // Recent activity includes null userEmail for system actions.
  test("includes null userEmail in recent activity", async () => {
    await insertTestAuditLog({
      action: "seed",
      entityType: "person",
      userEmail: null,
    });

    const metrics = await getDashboardMetrics();
    expect(metrics.recentActivity).toHaveLength(1);
    expect(metrics.recentActivity[0].userEmail).toBeNull();
    expect(metrics.recentActivity[0].action).toBe("seed");
  });

  // Returns empty recent activity when no audit logs exist.
  test("returns empty recent activity when no logs", async () => {
    await testPrisma.person.create({ data: { name: "A", email: "a@test.com" } });

    const metrics = await getDashboardMetrics();
    expect(metrics.recentActivity).toEqual([]);
  });

  // Soft-deleted persons must not appear in totalPersons count.
  test("excludes soft-deleted persons from totalPersons", async () => {
    await testPrisma.person.createMany({
      data: [
        { name: "Active", email: "active@test.com" },
        { name: "Deleted", email: "deleted@test.com", deletedAt: new Date() },
      ],
    });
    const metrics = await getDashboardMetrics();
    expect(metrics.totalPersons).toBe(1);
  });

  // Soft-deleted teams must not appear in totalTeams or teamSizes.
  test("excludes soft-deleted teams from totalTeams and teamSizes", async () => {
    await testPrisma.team.createMany({
      data: [{ teamName: "Active" }, { teamName: "Gone", deletedAt: new Date() }],
    });
    const metrics = await getDashboardMetrics();
    expect(metrics.totalTeams).toBe(1);
    expect(metrics.teamSizes).toHaveLength(1);
    expect(metrics.teamSizes[0].teamName).toBe("Active");
  });

  // Soft-deleted team members must not count toward memberCount.
  test("excludes soft-deleted team members from memberCount", async () => {
    const person1 = await testPrisma.person.create({ data: { name: "P1", email: "p1@test.com" } });
    const person2 = await testPrisma.person.create({ data: { name: "P2", email: "p2@test.com" } });
    const team = await testPrisma.team.create({ data: { teamName: "Alpha" } });
    await testPrisma.teamMember.createMany({
      data: [
        { personId: person1.id, teamId: team.teamId },
        { personId: person2.id, teamId: team.teamId, deletedAt: new Date() },
      ],
    });
    const metrics = await getDashboardMetrics();
    expect(metrics.teamSizes[0].memberCount).toBe(1); // only the active member
  });

  // Growth timeline with only teams (no persons or departments on those dates).
  test("growth timeline works when only teams exist", async () => {
    await testPrisma.team.create({
      data: { teamName: "Alpha", createdAt: new Date("2026-01-10T10:00:00Z") },
    });
    await testPrisma.team.create({
      data: { teamName: "Beta", createdAt: new Date("2026-01-10T14:00:00Z") },
    });
    const metrics = await getDashboardMetrics();
    expect(metrics.growthTimeline).toHaveLength(1);
    expect(metrics.growthTimeline[0]).toEqual({
      date: "2026-01-10",
      persons: 0,
      teams: 2,
      departments: 0,
    });
  });

  // Growth timeline window function: cumulative values accumulate across multiple dates.
  test("growth timeline accumulates cumulative totals across dates", async () => {
    await testPrisma.team.create({
      data: { teamName: "A", createdAt: new Date("2026-02-01T10:00:00Z") },
    });
    await testPrisma.team.create({
      data: { teamName: "B", createdAt: new Date("2026-02-05T10:00:00Z") },
    });
    await testPrisma.team.create({
      data: { teamName: "C", createdAt: new Date("2026-02-05T12:00:00Z") },
    });
    const metrics = await getDashboardMetrics();
    expect(metrics.growthTimeline[0].teams).toBe(1); // 2026-02-01: 1 cumulative
    expect(metrics.growthTimeline[1].teams).toBe(3); // 2026-02-05: 1+2 cumulative
  });

  // Demo session isolation: metrics must only reflect entities matching the current sessionId.
  test("demo session isolation — only counts entities for current session", async () => {
    // Production entities (sessionId = null)
    await testPrisma.person.createMany({
      data: [
        { name: "Prod1", email: "prod1@test.com" },
        { name: "Prod2", email: "prod2@test.com" },
      ],
    });
    // Demo session entities
    await testPrisma.person.createMany({
      data: [
        { name: "Demo1", email: "demo1@test.com", sessionId: "sess-abc" },
        { name: "Demo2", email: "demo2@test.com", sessionId: "sess-abc" },
        { name: "Demo3", email: "demo3@test.com", sessionId: "sess-abc" },
      ],
    });

    mockGetDemoSessionId.mockResolvedValueOnce("sess-abc");
    const metrics = await getDashboardMetrics();
    expect(metrics.totalPersons).toBe(3); // only the demo session's persons
  });

  // When MongoDB is unavailable, getDashboardMetrics returns empty recentActivity.
  test("returns empty recentActivity when MongoDB is unavailable", async () => {
    jest.spyOn(require("@/mongoDb"), "isMongoAvailable").mockReturnValueOnce(false);
    await testPrisma.person.create({ data: { name: "A", email: "a@test.com" } });

    const metrics = await getDashboardMetrics();
    expect(metrics.recentActivity).toEqual([]);
    expect(metrics.totalPersons).toBe(1); // PG counts still work
  });
});

describe("audit log permission checks", () => {
  const { hasPermission } = require("@/permissions");

  afterEach(() => {
    hasPermission.mockResolvedValue(true);
  });

  // Audit log queries are protected — users without admin:view_audit_log get denied.
  test("getAuditLogs throws when permission is denied", async () => {
    hasPermission.mockResolvedValueOnce(false);
    await expect(getAuditLogs()).rejects.toThrow("Permission denied");
  });

  // Same check applies to the email list query.
  test("getAuditLogUserEmails throws when permission is denied", async () => {
    hasPermission.mockResolvedValueOnce(false);
    await expect(getAuditLogUserEmails()).rejects.toThrow("Permission denied");
  });

  // Dashboard metrics are protected — users without dashboard:view get denied.
  test("getDashboardMetrics throws when permission is denied", async () => {
    hasPermission.mockResolvedValueOnce(false);
    await expect(getDashboardMetrics()).rejects.toThrow("Permission denied");
  });
});

describe("getDataExportCounts", () => {
  const { hasPermission } = require("@/permissions");

  beforeEach(async () => {
    await cleanDb();
    await cleanTestMongo();
    hasPermission.mockResolvedValue(true);
  });

  afterEach(() => {
    hasPermission.mockResolvedValue(true);
  });

  afterAll(() => cleanDb());

  // Returns entity counts for persons, teams, departments, and audit logs.
  test("returns correct entity counts when authorized", async () => {
    await testPrisma.person.createMany({
      data: [
        { name: "Alice", email: "a@test.com" },
        { name: "Bob", email: "b@test.com" },
      ],
    });
    await testPrisma.team.create({ data: { teamName: "Alpha" } });
    await testPrisma.department.create({ data: { name: "Engineering" } });
    await insertTestAuditLog({ action: "create", entityType: "person", userEmail: "a@test.com" });
    await insertTestAuditLog({ action: "update", entityType: "team", userEmail: "b@test.com" });
    await insertTestAuditLog({
      action: "delete",
      entityType: "department",
      userEmail: "a@test.com",
    });

    const counts = await getDataExportCounts();
    expect(counts.persons).toBe(2);
    expect(counts.teams).toBe(1);
    expect(counts.departments).toBe(1);
    expect(counts.auditLogs).toBe(3);
  });

  // Throws "Permission denied" when user lacks data:export permission.
  test("throws when permission is denied", async () => {
    hasPermission.mockResolvedValueOnce(false);
    await expect(getDataExportCounts()).rejects.toThrow("Permission denied");
  });
});

describe("getProfile", () => {
  beforeEach(async () => {
    await cleanDb();
  });
  afterAll(() => cleanDb());

  // Returns the full profile for an authenticated user with resolved permissions.
  test("returns user profile with resolved permissions", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    const profile = await getProfile();
    expect(profile).not.toBeNull();
    expect(profile!.email).toBe("alice@test.com");
    expect(profile!.name).toBe("Alice");
    expect(profile!.role).toBe("user");
    expect(profile!.resolvedPermissions).toBeDefined();
    expect(typeof profile!.resolvedPermissions["person:read"]).toBe("boolean");
  });

  // Returns null when no session exists (unauthenticated).
  test("returns null when not authenticated", async () => {
    auth.mockResolvedValueOnce(null);
    const profile = await getProfile();
    expect(profile).toBeNull();
  });

  // Returns null when session has no email.
  test("returns null when session has no email", async () => {
    auth.mockResolvedValueOnce({ user: { id: "some-id" } });
    const profile = await getProfile();
    expect(profile).toBeNull();
  });

  // Returns null when the user has been deleted from the database.
  test("returns null when user not found in database", async () => {
    auth.mockResolvedValueOnce({ user: { email: "deleted@test.com" } });
    const profile = await getProfile();
    expect(profile).toBeNull();
  });

  // Profile includes correct role-based default permissions for a user role.
  test("includes correct default permissions for user role", async () => {
    const user = await testPrisma.user.create({
      data: { email: "basic@test.com", name: "Basic User", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    const profile = await getProfile();
    expect(profile!.resolvedPermissions["person:read"]).toBe(true);
    expect(profile!.resolvedPermissions["person:create"]).toBe(false);
  });

  // Profile includes correct permissions for an administrator.
  test("includes correct permissions for administrator role", async () => {
    const user = await testPrisma.user.create({
      data: { email: "admin@test.com", name: "Admin", role: "administrator" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    const profile = await getProfile();
    expect(profile!.resolvedPermissions["person:create"]).toBe(true);
    expect(profile!.resolvedPermissions["dashboard:view"]).toBe(true);
  });

  // Superuser gets all permissions enabled.
  test("superuser gets all permissions granted", async () => {
    const user = await testPrisma.user.create({
      data: { email: "super@test.com", name: "Super", role: "superuser" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    const profile = await getProfile();
    const allTrue = Object.values(profile!.resolvedPermissions).every((v) => v === true);
    expect(allTrue).toBe(true);
  });

  // Returns createdAt and updatedAt as Date objects.
  test("returns date fields as Date instances", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    const profile = await getProfile();
    expect(profile!.createdAt).toBeInstanceOf(Date);
    expect(profile!.updatedAt).toBeInstanceOf(Date);
  });

  // Image field is included in the profile (can be null or a URL string).
  test("includes image field", async () => {
    const user = await testPrisma.user.create({
      data: {
        email: "alice@test.com",
        name: "Alice",
        role: "user",
        image: "https://example.com/pic.jpg",
      },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    const profile = await getProfile();
    expect(profile!.image).toBe("https://example.com/pic.jpg");
  });
});

describe("getPagedPersons", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(() => cleanDb());

  // Returns empty items and zero total when database is empty.
  test("returns empty items and total=0 when no persons exist", async () => {
    const result = await getPagedPersons();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  // Returns correct page of results with skip/take applied.
  test("paginates persons with page and pageSize", async () => {
    for (let i = 1; i <= 5; i++) {
      await testPrisma.person.create({ data: { name: `Person ${i}` } });
    }
    const page1 = await getPagedPersons({ page: 1, pageSize: 3 });
    expect(page1.items).toHaveLength(3);
    expect(page1.total).toBe(5);

    const page2 = await getPagedPersons({ page: 2, pageSize: 3 });
    expect(page2.items).toHaveLength(2);
    expect(page2.total).toBe(5);
  });

  // Filters results by name (case-insensitive).
  test("filters by search term across name, email, position", async () => {
    await testPrisma.person.create({
      data: { name: "Alice Dev", email: "alice@example.com", position: "Engineer" },
    });
    await testPrisma.person.create({ data: { name: "Bob Ops", email: "bob@example.com" } });

    const result = await getPagedPersons({ search: "alice" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Alice Dev");
    expect(result.total).toBe(1);
  });

  // Isolates persons by sessionId in demo mode.
  test("isolates persons by sessionId in demo mode", async () => {
    await testPrisma.person.create({ data: { name: "Demo Person", sessionId: "sess-1" } });
    await testPrisma.person.create({ data: { name: "Real Person", sessionId: null } });

    mockGetDemoSessionId.mockResolvedValueOnce("sess-1");
    const result = await getPagedPersons();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Demo Person");
  });
});

describe("getPagedTeams", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(() => cleanDb());

  // Returns empty items and zero total when database is empty.
  test("returns empty items and total=0 when no teams exist", async () => {
    const result = await getPagedTeams();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  // Paginates teams across multiple pages.
  test("paginates teams with page and pageSize", async () => {
    for (let i = 1; i <= 4; i++) {
      await testPrisma.team.create({ data: { teamName: `Team ${i}` } });
    }
    const page1 = await getPagedTeams({ page: 1, pageSize: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(4);

    const page2 = await getPagedTeams({ page: 2, pageSize: 2 });
    expect(page2.items).toHaveLength(2);
  });

  // Filters teams by team name (case-insensitive).
  test("filters by team name search term", async () => {
    await testPrisma.team.create({ data: { teamName: "Engineering" } });
    await testPrisma.team.create({ data: { teamName: "Marketing" } });

    const result = await getPagedTeams({ search: "engi" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].teamName).toBe("Engineering");
    expect(result.total).toBe(1);
  });
});

describe("getPagedDepartments", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(() => cleanDb());

  // Returns empty items and zero total when database is empty.
  test("returns empty items and total=0 when no departments exist", async () => {
    const result = await getPagedDepartments();
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  // Paginates departments across multiple pages.
  test("paginates departments with page and pageSize", async () => {
    for (let i = 1; i <= 5; i++) {
      await testPrisma.department.create({ data: { name: `Dept ${i}` } });
    }
    const page1 = await getPagedDepartments({ page: 1, pageSize: 3 });
    expect(page1.items).toHaveLength(3);
    expect(page1.total).toBe(5);
  });

  // Filters departments by name search term.
  test("filters by department name search term", async () => {
    await testPrisma.department.create({
      data: { name: "Engineering", description: "Builds things" },
    });
    await testPrisma.department.create({ data: { name: "HR" } });

    const result = await getPagedDepartments({ search: "engin" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Engineering");
    expect(result.total).toBe(1);
  });
});

describe("getOrgChartData", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  // Returns empty departments, teams, and persons when no data exists.
  test("returns empty data for empty database", async () => {
    const { getOrgChartData } = await import("@/queries");
    const data = await getOrgChartData();
    expect(data.departments).toHaveLength(0);
    expect(data.unassignedTeams).toHaveLength(0);
    expect(data.unassignedPersons).toHaveLength(0);
  });

  // Returns departments with their teams and team members.
  test("returns department hierarchy with teams and members", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com", position: "Developer" },
    });
    const dept = await testPrisma.department.create({
      data: { name: "Engineering" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Backend", departmentId: dept.id, teamManagerId: person.id },
    });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    const { getOrgChartData } = await import("@/queries");
    const data = await getOrgChartData();
    expect(data.departments).toHaveLength(1);
    expect(data.departments[0].name).toBe("Engineering");
    expect(data.departments[0].teams).toHaveLength(1);
    expect(data.departments[0].teams[0].teamName).toBe("Backend");
    expect(data.departments[0].teams[0].managerName).toBe("Alice");
    expect(data.departments[0].teams[0].members).toHaveLength(1);
    expect(data.departments[0].teams[0].members[0].name).toBe("Alice");
  });

  // Teams without a department appear in unassignedTeams.
  test("returns unassigned teams separately", async () => {
    await testPrisma.team.create({ data: { teamName: "Freelancers" } });

    const { getOrgChartData } = await import("@/queries");
    const data = await getOrgChartData();
    expect(data.unassignedTeams).toHaveLength(1);
    expect(data.unassignedTeams[0].teamName).toBe("Freelancers");
  });

  // Persons not in any team appear in unassignedPersons.
  test("returns unassigned persons separately", async () => {
    await testPrisma.person.create({ data: { name: "Bob", email: "bob@test.com" } });

    const { getOrgChartData } = await import("@/queries");
    const data = await getOrgChartData();
    expect(data.unassignedPersons).toHaveLength(1);
    expect(data.unassignedPersons[0].name).toBe("Bob");
  });

  // Soft-deleted records are excluded from the org chart.
  test("excludes soft-deleted records", async () => {
    await testPrisma.person.create({
      data: { name: "Deleted", email: "del@test.com", deletedAt: new Date() },
    });
    await testPrisma.team.create({ data: { teamName: "Gone", deletedAt: new Date() } });
    await testPrisma.department.create({ data: { name: "Old", deletedAt: new Date() } });

    const { getOrgChartData } = await import("@/queries");
    const data = await getOrgChartData();
    expect(data.departments).toHaveLength(0);
    expect(data.unassignedTeams).toHaveLength(0);
    expect(data.unassignedPersons).toHaveLength(0);
  });
});

describe("getPersonDeleteImpact", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(() => cleanDb());

  // Returns empty arrays and zero counts when person has no references.
  test("returns empty impact for isolated person", async () => {
    const person = await testPrisma.person.create({ data: { name: "Loner" } });
    const impact = await getPersonDeleteImpact(person.id);
    expect(impact.managedTeams).toEqual([]);
    expect(impact.headedDepartments).toEqual([]);
    expect(impact.teamMemberships).toEqual([]);
    expect(impact.leaveRequests).toBe(0);
    expect(impact.reviewRequests).toBe(0);
  });

  // Returns managed teams, headed departments, and team memberships.
  test("returns all references for a well-connected person", async () => {
    const person = await testPrisma.person.create({ data: { name: "Boss" } });
    const team = await testPrisma.team.create({
      data: { teamName: "Alpha", teamManagerId: person.id },
    });
    await testPrisma.department.create({
      data: { name: "Engineering", headId: person.id },
    });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    const impact = await getPersonDeleteImpact(person.id);
    expect(impact.managedTeams).toHaveLength(1);
    expect(impact.managedTeams[0].teamName).toBe("Alpha");
    expect(impact.headedDepartments).toHaveLength(1);
    expect(impact.headedDepartments[0].name).toBe("Engineering");
    expect(impact.teamMemberships).toHaveLength(1);
    expect(impact.teamMemberships[0].teamName).toBe("Alpha");
  });
});

describe("getTeamDeleteImpact", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(() => cleanDb());

  // Returns zero members and null department for an empty team.
  test("returns empty impact for isolated team", async () => {
    const team = await testPrisma.team.create({ data: { teamName: "Empty" } });
    const impact = await getTeamDeleteImpact(team.teamId);
    expect(impact.memberCount).toBe(0);
    expect(impact.departmentName).toBeNull();
  });

  // Returns member count and department name.
  test("returns member count and department name", async () => {
    const dept = await testPrisma.department.create({ data: { name: "HR" } });
    const team = await testPrisma.team.create({
      data: { teamName: "Recruiting", departmentId: dept.id },
    });
    const person = await testPrisma.person.create({ data: { name: "Alice" } });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    const impact = await getTeamDeleteImpact(team.teamId);
    expect(impact.memberCount).toBe(1);
    expect(impact.departmentName).toBe("HR");
  });
});

describe("getDepartmentDeleteImpact", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(() => cleanDb());

  // Returns empty teams array for a department with no teams.
  test("returns empty impact for isolated department", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Empty" } });
    const impact = await getDepartmentDeleteImpact(dept.id);
    expect(impact.teams).toEqual([]);
  });

  // Returns teams assigned to the department.
  test("returns assigned teams", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Eng" } });
    await testPrisma.team.create({ data: { teamName: "Backend", departmentId: dept.id } });
    await testPrisma.team.create({ data: { teamName: "Frontend", departmentId: dept.id } });

    const impact = await getDepartmentDeleteImpact(dept.id);
    expect(impact.teams).toHaveLength(2);
    const names = impact.teams.map((t) => t.teamName).sort();
    expect(names).toEqual(["Backend", "Frontend"]);
  });
});

describe("leave query permission checks", () => {
  const { hasPermission } = require("@/permissions");

  afterEach(() => {
    hasPermission.mockResolvedValue(true);
  });

  // Leave requests are protected — users without leave:view get denied.
  test("getLeaveRequests throws when permission is denied", async () => {
    hasPermission.mockResolvedValueOnce(false);
    await expect(getLeaveRequests()).rejects.toThrow("Permission denied");
  });

  // Leave balances are protected — users without leave:view get denied.
  test("getLeaveBalances throws when permission is denied", async () => {
    hasPermission.mockResolvedValueOnce(false);
    await expect(getLeaveBalances()).rejects.toThrow("Permission denied");
  });
});

afterAll(() => testPrisma.$disconnect());
