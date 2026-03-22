import { testPrisma, cleanDb } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
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

import {
  getPersons,
  getTeams,
  getDepartments,
  getUsers,
  getUserById,
  getAllPermissionKeys,
  getAuditLogs,
  getAuditLogUserEmails,
} from "@/queries";

describe("getPersons", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

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

  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

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

  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

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
});

describe("getUserById", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

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
});

describe("getAllPermissionKeys", () => {
  // Should return all 23 permission keys defined in the system.
  test("returns all 23 permission keys", async () => {
    const keys = await getAllPermissionKeys();
    expect(keys).toHaveLength(23);
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
  });

  // Returns empty result when no audit logs exist.
  test("returns empty array when no logs exist", async () => {
    const result = await getAuditLogs();
    expect(result.logs).toEqual([]);
    expect(result.total).toBe(0);
  });

  // Returns logs in descending order by createdAt (newest first).
  test("returns logs in descending order", async () => {
    await testPrisma.auditLog.create({
      data: {
        action: "create",
        entityType: "person",
        userEmail: "alice@example.com",
        createdAt: new Date("2026-01-01"),
      },
    });
    await testPrisma.auditLog.create({
      data: {
        action: "update",
        entityType: "person",
        userEmail: "bob@example.com",
        createdAt: new Date("2026-02-01"),
      },
    });
    const result = await getAuditLogs();
    expect(result.logs).toHaveLength(2);
    expect(result.logs[0].action).toBe("update");
    expect(result.logs[1].action).toBe("create");
  });

  // Filters logs by userEmail.
  test("filters by userEmail", async () => {
    await testPrisma.auditLog.create({
      data: { action: "create", entityType: "person", userEmail: "alice@example.com" },
    });
    await testPrisma.auditLog.create({
      data: { action: "delete", entityType: "person", userEmail: "bob@example.com" },
    });
    const result = await getAuditLogs({ userEmail: "alice" });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].userEmail).toBe("alice@example.com");
    expect(result.total).toBe(1);
  });

  // Filters logs by action type.
  test("filters by action", async () => {
    await testPrisma.auditLog.create({
      data: { action: "create", entityType: "person", userEmail: "a@b.com" },
    });
    await testPrisma.auditLog.create({
      data: { action: "delete", entityType: "person", userEmail: "a@b.com" },
    });
    const result = await getAuditLogs({ action: "delete" });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].action).toBe("delete");
  });

  // Filters logs by entity type.
  test("filters by entityType", async () => {
    await testPrisma.auditLog.create({
      data: { action: "create", entityType: "person", userEmail: "a@b.com" },
    });
    await testPrisma.auditLog.create({
      data: { action: "create", entityType: "team", userEmail: "a@b.com" },
    });
    const result = await getAuditLogs({ entityType: "team" });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].entityType).toBe("team");
  });

  // Paginates correctly — page 1 vs page 2 return different results.
  test("paginates correctly", async () => {
    for (let i = 0; i < 5; i++) {
      await testPrisma.auditLog.create({
        data: { action: "create", entityType: "person", userEmail: `user${i}@example.com` },
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
    await testPrisma.auditLog.create({
      data: { action: "create", entityType: "person", userEmail: "a@b.com", createdAt: old },
    });
    await testPrisma.auditLog.create({
      data: { action: "update", entityType: "person", userEmail: "a@b.com", createdAt: mid },
    });
    await testPrisma.auditLog.create({
      data: { action: "delete", entityType: "person", userEmail: "a@b.com", createdAt: recent },
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
      await testPrisma.auditLog.create({
        data: { action: "create", entityType: "person", userEmail: "a@b.com" },
      });
    }
    await testPrisma.auditLog.create({
      data: { action: "delete", entityType: "person", userEmail: "a@b.com" },
    });
    const result = await getAuditLogs({ action: "create", page: 1, pageSize: 2 });
    expect(result.logs).toHaveLength(2);
    expect(result.total).toBe(3);
  });
});

describe("getAuditLogUserEmails", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  // Returns empty array when no logs exist.
  test("returns empty array when no logs exist", async () => {
    const result = await getAuditLogUserEmails();
    expect(result).toEqual([]);
  });

  // Returns distinct emails only — no duplicates.
  test("returns distinct emails", async () => {
    await testPrisma.auditLog.create({
      data: { action: "create", entityType: "person", userEmail: "alice@example.com" },
    });
    await testPrisma.auditLog.create({
      data: { action: "update", entityType: "person", userEmail: "alice@example.com" },
    });
    await testPrisma.auditLog.create({
      data: { action: "delete", entityType: "person", userEmail: "bob@example.com" },
    });
    const result = await getAuditLogUserEmails();
    expect(result).toEqual(["alice@example.com", "bob@example.com"]);
  });

  // Excludes null emails (system/anonymous actions).
  test("excludes null emails", async () => {
    await testPrisma.auditLog.create({
      data: { action: "create", entityType: "person", userEmail: null },
    });
    await testPrisma.auditLog.create({
      data: { action: "create", entityType: "person", userEmail: "alice@example.com" },
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
});
