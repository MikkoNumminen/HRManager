import { testPrisma, cleanDb, createTestPerson, createTestTeam } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock next-auth — it uses ESM imports that Jest can't parse in CJS mode.
// The auth module is imported transitively via permissions.ts → auth.ts → next-auth.
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock permissions — requirePermission is a no-op so server action tests focus
// on data logic. Permission resolution is tested separately in permissions.test.ts.
jest.mock("@/permissions", () => ({
  requirePermission: jest.fn(),
  seedPermissions: jest.fn(),
}));

// Mock audit logging — logAudit/deferAudit call auth() and after() which need request scope.
// Audit log behavior is tested separately.
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
// Rate limiting behavior is tested separately in rateLimit.test.ts.
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
// Individual tests override mockGetDemoSessionId to simulate demo sessions.
const mockGetDemoSessionId = jest.fn().mockResolvedValue(null);
jest.mock("@/demoSession", () => ({
  getDemoSessionId: () => mockGetDemoSessionId(),
}));

// Mock Next.js server functions — these don't exist in a test environment,
// but the server actions call them after every mutation.
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  updateTag: jest.fn(),
  unstable_cache: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import {
  resetAll,
  seedMockData,
  initializePermissions,
  updateUserRole,
  updateUserPermission,
  kickOutUser,
} from "@/features/admin/actions";

const { auth } = require("@/auth");

// Helper to build FormData — server actions receive form submissions,
// so we simulate that by packing key-value pairs into a FormData object.
function formData(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      value.forEach((v) => fd.append(key, v));
    } else {
      fd.append(key, value);
    }
  }
  return fd;
}

describe("resetAll", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // The nuclear option: wipe everything — all people, all teams, all memberships.
  // Used for starting fresh. Verify every table is empty afterward.
  test("deletes all persons, teams, and team members", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const team = await createTestTeam({ teamName: "Team A" });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    await resetAll();

    expect(await testPrisma.person.findMany()).toHaveLength(0);
    expect(await testPrisma.team.findMany()).toHaveLength(0);
    expect(await testPrisma.teamMember.findMany()).toHaveLength(0);
  });

  // Resetting an already empty database should just work without complaining.
  test("succeeds on empty database", async () => {
    expect(await resetAll()).toBeUndefined();
  });
});

describe("updateUserRole", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Change a user's role from "user" to "administrator" and verify it saved.
  test("updates a user's role", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });

    await updateUserRole(formData({ userId: user.id, role: "administrator" }));

    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.role).toBe("administrator");
  });

  // You can't assign the "superuser" role through the UI — it's bootstrapped only.
  test("throws when trying to assign superuser role", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });

    expect(await updateUserRole(formData({ userId: user.id, role: "superuser" }))).toMatchObject({
      error: expect.stringContaining("Invalid role"),
    });
  });

  // Can't change the superuser's role — it's permanent and locked.
  test("throws when trying to change the superuser's role", async () => {
    const user = await testPrisma.user.create({
      data: { email: "super@test.com", name: "Super", role: "superuser" },
    });

    expect(await updateUserRole(formData({ userId: user.id, role: "user" }))).toMatchObject({
      error: expect.stringContaining("Cannot change the superuser's role"),
    });
  });

  // Can't update a user that doesn't exist.
  test("throws when user not found", async () => {
    expect(
      await updateUserRole(
        formData({ userId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", role: "user" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("User not found") });
  });

  // UUID validation — garbage IDs get caught early.
  test("throws on invalid UUID", async () => {
    expect(await updateUserRole(formData({ userId: "bad-id", role: "user" }))).toMatchObject({
      error: expect.stringContaining("Invalid userId format"),
    });
  });

  // Both fields are required — no partial submissions.
  test("throws when userId is missing", async () => {
    expect(await updateUserRole(formData({ role: "user" }))).toMatchObject({
      error: expect.stringContaining("No userId provided"),
    });
  });

  // Role field is also required.
  test("throws when role is missing", async () => {
    expect(
      await updateUserRole(formData({ userId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).toMatchObject({ error: expect.stringContaining("No role provided") });
  });

  // Demo sessions can assign the superuser role — sandbox data, no restrictions needed.
  test("allows assigning superuser role in demo session", async () => {
    mockGetDemoSessionId.mockResolvedValueOnce("demo-sess-123");
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });

    await updateUserRole(formData({ userId: user.id, role: "superuser" }));

    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.role).toBe("superuser");
  });

  // Demo sessions can change a superuser's role — experiment freely with all roles.
  test("allows changing superuser role in demo session", async () => {
    mockGetDemoSessionId.mockResolvedValueOnce("demo-sess-123");
    const user = await testPrisma.user.create({
      data: { email: "super@test.com", name: "Super", role: "superuser" },
    });

    await updateUserRole(formData({ userId: user.id, role: "administrator" }));

    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.role).toBe("administrator");
  });
});

describe("updateUserPermission", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Grant a permission override to a user and verify it's stored.
  test("grants a permission override", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    const perm = await testPrisma.permission.create({
      data: { key: "person:create", description: "Create persons" },
    });

    await updateUserPermission(
      formData({ userId: user.id, permissionKey: "person:create", action: "grant" }),
    );

    const override = await testPrisma.userPermission.findUnique({
      where: { userId_permissionId: { userId: user.id, permissionId: perm.id } },
    });
    expect(override).not.toBeNull();
    expect(override!.granted).toBe(true);
  });

  // Deny a permission explicitly — creates an override with granted=false.
  test("denies a permission override", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "administrator" },
    });
    const perm = await testPrisma.permission.create({
      data: { key: "person:create", description: "Create persons" },
    });

    await updateUserPermission(
      formData({ userId: user.id, permissionKey: "person:create", action: "deny" }),
    );

    const override = await testPrisma.userPermission.findUnique({
      where: { userId_permissionId: { userId: user.id, permissionId: perm.id } },
    });
    expect(override).not.toBeNull();
    expect(override!.granted).toBe(false);
  });

  // Reset removes the override entirely — user falls back to role default.
  test("resets a permission override", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    const perm = await testPrisma.permission.create({
      data: { key: "person:create", description: "Create persons" },
    });
    await testPrisma.userPermission.create({
      data: { userId: user.id, permissionId: perm.id, granted: true },
    });

    await updateUserPermission(
      formData({ userId: user.id, permissionKey: "person:create", action: "reset" }),
    );

    const overrides = await testPrisma.userPermission.findMany({
      where: { userId: user.id },
    });
    expect(overrides).toHaveLength(0);
  });

  // Granting the same permission twice should upsert, not duplicate.
  test("upserts when granting an already-overridden permission", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    const perm = await testPrisma.permission.create({
      data: { key: "person:create", description: "Create persons" },
    });
    await testPrisma.userPermission.create({
      data: { userId: user.id, permissionId: perm.id, granted: false },
    });

    await updateUserPermission(
      formData({ userId: user.id, permissionKey: "person:create", action: "grant" }),
    );

    const override = await testPrisma.userPermission.findUnique({
      where: { userId_permissionId: { userId: user.id, permissionId: perm.id } },
    });
    expect(override!.granted).toBe(true);
  });

  // Can't modify the superuser's permissions — they always have everything.
  test("throws when trying to modify superuser permissions", async () => {
    const user = await testPrisma.user.create({
      data: { email: "super@test.com", name: "Super", role: "superuser" },
    });
    await testPrisma.permission.create({
      data: { key: "person:create", description: "Create persons" },
    });

    expect(
      await updateUserPermission(
        formData({ userId: user.id, permissionKey: "person:create", action: "grant" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Cannot modify superuser permissions") });
  });

  // Can't modify permissions for a user that doesn't exist.
  test("throws when user not found", async () => {
    await testPrisma.permission.create({
      data: { key: "person:create", description: "Create persons" },
    });

    expect(
      await updateUserPermission(
        formData({
          userId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          permissionKey: "person:create",
          action: "grant",
        }),
      ),
    ).toMatchObject({ error: expect.stringContaining("User not found") });
  });

  // Can't grant a permission that doesn't exist in the catalog.
  test("throws when permission key not found", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });

    expect(
      await updateUserPermission(
        formData({ userId: user.id, permissionKey: "fake:permission", action: "grant" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Permission not found") });
  });

  // UUID validation on the userId field.
  test("throws on invalid UUID", async () => {
    expect(
      await updateUserPermission(
        formData({ userId: "bad", permissionKey: "person:create", action: "grant" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Invalid userId format") });
  });

  // All three required fields must be present — no partial submissions.
  test("throws when userId is missing", async () => {
    expect(
      await updateUserPermission(formData({ permissionKey: "person:create", action: "grant" })),
    ).toMatchObject({ error: expect.stringContaining("No userId provided") });
  });

  // Permission key is required.
  test("throws when permissionKey is missing", async () => {
    expect(
      await updateUserPermission(
        formData({ userId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", action: "grant" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("No permissionKey provided") });
  });

  // Action is required.
  test("throws when action is missing", async () => {
    expect(
      await updateUserPermission(
        formData({
          userId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          permissionKey: "person:create",
        }),
      ),
    ).toMatchObject({ error: expect.stringContaining("No action provided") });
  });

  // Demo sessions can modify superuser permissions — sandbox lets you experiment.
  test("allows modifying superuser permissions in demo session", async () => {
    mockGetDemoSessionId.mockResolvedValueOnce("demo-sess-123");
    const user = await testPrisma.user.create({
      data: { email: "super@test.com", name: "Super", role: "superuser" },
    });
    const perm = await testPrisma.permission.create({
      data: { key: "person:create", description: "Create persons" },
    });

    await updateUserPermission(
      formData({ userId: user.id, permissionKey: "person:create", action: "deny" }),
    );

    const override = await testPrisma.userPermission.findFirst({
      where: { userId: user.id, permissionId: perm.id },
    });
    expect(override!.granted).toBe(false);
  });
});

describe("seedMockData", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Seeds 9 persons into the database (shared seed data from seeds.ts).
  test("creates 9 persons", async () => {
    await seedMockData();

    const persons = await testPrisma.person.findMany();
    expect(persons).toHaveLength(9);
  });

  // Seeds 5 teams with the correct names (shared seed data from seeds.ts).
  test("creates 5 teams", async () => {
    await seedMockData();

    const teams = await testPrisma.team.findMany({ orderBy: { teamName: "asc" } });
    expect(teams).toHaveLength(5);
    expect(teams.map((t) => t.teamName)).toEqual([
      "Data Analytics",
      "Design",
      "Engineering",
      "People & Culture",
      "Platform",
    ]);
  });

  // Seeds team memberships — 10 total across the five teams.
  test("creates team memberships", async () => {
    await seedMockData();

    const members = await testPrisma.teamMember.findMany();
    expect(members).toHaveLength(10);
  });

  // Assigns managers to all five teams.
  test("assigns correct managers to teams", async () => {
    await seedMockData();

    const engineering = await testPrisma.team.findFirst({
      where: { teamName: "Engineering" },
      include: { manager: true },
    });
    expect(engineering!.manager!.name).toBe("Alice Johnson");

    const design = await testPrisma.team.findFirst({
      where: { teamName: "Design" },
      include: { manager: true },
    });
    expect(design!.manager!.name).toBe("Carol Davis");

    const platform = await testPrisma.team.findFirst({
      where: { teamName: "Platform" },
      include: { manager: true },
    });
    expect(platform!.manager!.name).toBe("Grace Park");
  });

  // Seeds 4 mock users for the admin panel demo.
  test("creates 4 mock users", async () => {
    await seedMockData();

    const users = await testPrisma.user.findMany({ orderBy: { email: "asc" } });
    expect(users).toHaveLength(4);
    expect(users.map((u) => u.role)).toEqual(
      expect.arrayContaining(["administrator", "user", "user", "guest"]),
    );
  });

  // Running seedMockData twice with clearExisting=true should not duplicate data.
  test("is idempotent when clearExisting is true", async () => {
    await seedMockData(true);
    await seedMockData(true);

    const persons = await testPrisma.person.findMany();
    expect(persons).toHaveLength(9);
    const teams = await testPrisma.team.findMany();
    expect(teams).toHaveLength(5);
    const users = await testPrisma.user.findMany();
    expect(users).toHaveLength(4);
  });

  // Running seedMockData twice with clearExisting=false should not duplicate persons, teams,
  // or memberships — the upsert/skip logic handles already-existing seed rows.
  test("is idempotent when clearExisting is false (skips existing persons/teams/members)", async () => {
    await seedMockData(true);
    // Second call with clearExisting=false hits the "already exists" skip branches
    await seedMockData(false);

    const persons = await testPrisma.person.findMany({ where: { sessionId: null } });
    expect(persons).toHaveLength(9);
    const teams = await testPrisma.team.findMany({ where: { sessionId: null } });
    expect(teams).toHaveLength(5);
    const members = await testPrisma.teamMember.findMany({ where: { sessionId: null } });
    expect(members).toHaveLength(10);
  });

  // With clearExisting=false, existing data should be preserved alongside seeded data.
  test("preserves existing data when clearExisting is false", async () => {
    await createTestPerson({ name: "Pre-existing", email: "existing@test.com" });

    await seedMockData(false);

    const persons = await testPrisma.person.findMany();
    expect(persons).toHaveLength(10); // 9 seeded + 1 pre-existing
    expect(persons.some((p) => p.email === "existing@test.com")).toBe(true);
  });

  // Grants data:seed permission override to admin@example.com when permission rows exist.
  test("creates permission override for admin user", async () => {
    // Create the required permission rows so the upsert branch is reached
    await testPrisma.permission.createMany({
      data: [
        { key: "data:seed", description: "Load mock data" },
        { key: "person:create", description: "Create person" },
      ],
    });

    await seedMockData();

    const adminUser = await testPrisma.user.findUnique({ where: { email: "admin@example.com" } });
    expect(adminUser).not.toBeNull();
    const seedPerm = await testPrisma.permission.findUnique({ where: { key: "data:seed" } });
    const override = await testPrisma.userPermission.findUnique({
      where: { userId_permissionId: { userId: adminUser!.id, permissionId: seedPerm!.id } },
    });
    expect(override).not.toBeNull();
    expect(override!.granted).toBe(true);
  });

  // Grants person:create permission override to user1@example.com when permission rows exist.
  test("creates permission override for regular user", async () => {
    await testPrisma.permission.createMany({
      data: [
        { key: "data:seed", description: "Load mock data" },
        { key: "person:create", description: "Create person" },
      ],
    });

    await seedMockData();

    const user1 = await testPrisma.user.findUnique({ where: { email: "user1@example.com" } });
    expect(user1).not.toBeNull();
    const createPerm = await testPrisma.permission.findUnique({ where: { key: "person:create" } });
    const override = await testPrisma.userPermission.findUnique({
      where: { userId_permissionId: { userId: user1!.id, permissionId: createPerm!.id } },
    });
    expect(override).not.toBeNull();
    expect(override!.granted).toBe(true);
  });

  // Production environment skips mock user seeding to prevent test accounts in prod DB.
  test("skips mock user seeding in production environment", async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      await seedMockData();

      // Persons/teams are still seeded (scoped by sessionId)
      const persons = await testPrisma.person.findMany();
      expect(persons).toHaveLength(9);
      // No mock users created in production
      const users = await testPrisma.user.findMany();
      expect(users).toHaveLength(0);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    }
  });

  // Demo sessions skip user seeding but still call seedPermissions for the permission catalog.
  test("calls seedPermissions in demo session without seeding users", async () => {
    const { seedPermissions } = require("@/permissions");
    seedPermissions.mockClear();
    mockGetDemoSessionId.mockResolvedValueOnce("demo-sess-123");

    await seedMockData();

    // seedPermissions is called for the permission catalog even in demo mode
    expect(seedPermissions).toHaveBeenCalled();
    // No mock users should be created (User table has no sessionId)
    const users = await testPrisma.user.findMany();
    expect(users).toHaveLength(0);
    // Persons and teams should still be seeded (they have sessionId)
    const persons = await testPrisma.person.findMany();
    expect(persons).toHaveLength(9);
  });
});

describe("initializePermissions", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(() => cleanDb(), 30_000);

  // Calls seedPermissions (mocked) — verifies the function runs without error.
  test("calls seedPermissions successfully", async () => {
    const { seedPermissions } = require("@/permissions");
    await initializePermissions();
    expect(seedPermissions).toHaveBeenCalled();
  });
});

describe("kickOutUser", () => {
  beforeEach(() => cleanDb(), 30_000);
  afterAll(async () => {
    await cleanDb();
  }, 30_000);

  // Deletes the user and all their permission overrides from the database.
  test("removes user and their permissions", async () => {
    const user = await testPrisma.user.create({
      data: { email: "kick@test.com", name: "Kickable", role: "user" },
    });
    const perm = await testPrisma.permission.findFirst({ where: { key: "person:read" } });
    if (perm) {
      await testPrisma.userPermission.create({
        data: { userId: user.id, permissionId: perm.id, granted: true },
      });
    }

    await kickOutUser(formData({ userId: user.id }));

    const deletedUser = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(deletedUser).toBeNull();
    const perms = await testPrisma.userPermission.findMany({ where: { userId: user.id } });
    expect(perms).toHaveLength(0);
  });

  // Refuses to kick out a superuser — they are untouchable.
  test("throws when trying to kick out a superuser", async () => {
    const superuser = await testPrisma.user.create({
      data: { email: "super@test.com", name: "Super", role: "superuser" },
    });

    expect(await kickOutUser(formData({ userId: superuser.id }))).toMatchObject({
      error: expect.stringContaining("Cannot kick out the superuser"),
    });

    // Verify user was not deleted
    const stillExists = await testPrisma.user.findUnique({ where: { id: superuser.id } });
    expect(stillExists).not.toBeNull();
  });

  // Throws when no userId is provided in the form data.
  test("throws on missing userId", async () => {
    expect(await kickOutUser(formData({}))).toMatchObject({
      error: expect.stringContaining("No userId provided"),
    });
  });

  // Throws when the userId doesn't match any user in the database.
  test("throws on non-existent user", async () => {
    expect(
      await kickOutUser(formData({ userId: "00000000-0000-0000-0000-000000000000" })),
    ).toMatchObject({ error: expect.stringContaining("User not found"), code: "userNotFound" });
  });

  // Throws when userId is not a valid UUID format.
  test("throws on invalid UUID", async () => {
    expect(await kickOutUser(formData({ userId: "not-a-uuid" }))).toMatchObject({
      error: expect.any(String),
    });
  });

  // Demo sessions cannot kick real OAuth users — only the demo user is allowed.
  test("throws when demo session tries to kick a non-demo user", async () => {
    mockGetDemoSessionId.mockResolvedValueOnce("demo-sess-123");
    const realUser = await testPrisma.user.create({
      data: { email: "real@oauth.com", name: "Real User", role: "user" },
    });

    expect(await kickOutUser(formData({ userId: realUser.id }))).toMatchObject({
      error: expect.stringContaining("Demo sessions cannot manage real users"),
    });

    // Verify user was not deleted
    const stillExists = await testPrisma.user.findUnique({ where: { id: realUser.id } });
    expect(stillExists).not.toBeNull();
  });

  // Users cannot kick themselves out — it would orphan the session.
  test("throws when user tries to kick themselves", async () => {
    const user = await testPrisma.user.create({
      data: { email: "selfkick@test.com", name: "Self Kicker", role: "administrator" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });

    expect(await kickOutUser(formData({ userId: user.id }))).toMatchObject({
      error: expect.stringContaining("Cannot kick yourself out"),
    });

    // Verify user was not deleted
    const stillExists = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(stillExists).not.toBeNull();
  });
});

afterAll(() => testPrisma.$disconnect());
