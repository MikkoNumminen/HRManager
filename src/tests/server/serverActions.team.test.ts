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
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import {
  createTeam,
  updateTeamName,
  removeTeam,
  addManager,
  addMember,
  removeMember,
} from "@/serverActions";

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

describe("createTeam", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Create a team and verify it shows up in the database with no manager assigned yet.
  test("creates a team with null manager", async () => {
    await createTeam(formData({ name: "New Team" }));

    const teams = await testPrisma.team.findMany();
    expect(teams).toHaveLength(1);
    expect(teams[0].teamName).toBe("New Team");
    expect(teams[0].teamManagerId).toBeNull();
  });

  // Extra spaces around the team name get cleaned up before saving.
  test("trims whitespace from team name", async () => {
    await createTeam(formData({ name: "  Trimmed  " }));

    const [team] = await testPrisma.team.findMany();
    expect(team.teamName).toBe("Trimmed");
  });

  // A team with no name is not a team — you have to call it something.
  test("throws on empty name", async () => {
    expect(await createTeam(formData({ name: "" }))).toMatchObject({
      error: expect.stringContaining("Invalid Name"),
    });
  });

  // Spaces alone don't count as a team name, just like with person names.
  test("throws on whitespace-only name", async () => {
    expect(await createTeam(formData({ name: "   " }))).toMatchObject({
      error: expect.stringContaining("Invalid Name"),
    });
  });

  // Team names have a length limit to prevent abuse.
  test("throws when team name exceeds max length", async () => {
    const longName = "A".repeat(256);
    expect(await createTeam(formData({ name: longName }))).toMatchObject({
      error: expect.stringContaining("characters or less"),
    });
  });
});

describe("updateTeamName", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Rename a team and verify the database actually saved it.
  test("renames a team", async () => {
    const team = await createTestTeam({ teamName: "Engineering" });

    await updateTeamName(formData({ teamID: team.teamId, name: "Platform" }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.teamName).toBe("Platform");
  });

  // We need to know WHICH team to rename — can't do it without an ID.
  test("throws when no teamID provided", async () => {
    expect(await updateTeamName(formData({ name: "New Name" }))).toMatchObject({
      error: expect.stringContaining("No teamID provided"),
    });
  });

  // The ID has to be a proper UUID, not some random string.
  test("throws on invalid UUID", async () => {
    expect(await updateTeamName(formData({ teamID: "bad", name: "New Name" }))).toMatchObject({
      error: expect.stringContaining("Invalid teamID format"),
    });
  });

  // You can't set a team's name to nothing — names are required.
  test("throws when name is empty", async () => {
    const team = await createTestTeam({ teamName: "Engineering" });
    expect(await updateTeamName(formData({ teamID: team.teamId, name: "" }))).toMatchObject({
      error: expect.stringContaining("New team name is missing"),
    });
  });

  // Team names have a length limit.
  test("throws when new name exceeds max length", async () => {
    const team = await createTestTeam({ teamName: "Eng" });
    const longName = "A".repeat(256);
    expect(await updateTeamName(formData({ teamID: team.teamId, name: longName }))).toMatchObject({
      error: expect.stringContaining("characters or less"),
    });
  });

  // Can't rename a team that doesn't exist.
  test("throws when team does not exist", async () => {
    expect(
      await updateTeamName(
        formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", name: "New" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Team not found") });
  });
});

describe("removeTeam", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Delete a team and confirm it's soft-deleted.
  test("removes a team", async () => {
    const team = await createTestTeam({ teamName: "To Delete" });

    await removeTeam(formData({ teamID: team.teamId }));
    const teams = await testPrisma.team.findMany({ where: { deletedAt: null } });
    expect(teams).toHaveLength(0);
  });

  // When a team is soft-deleted, all its membership records are also
  // soft-deleted. But the people themselves should still exist —
  // deleting a team doesn't fire the employees!
  test("cascade deletes team members when team is removed", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const team = await createTestTeam({ teamName: "To Delete" });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    await removeTeam(formData({ teamID: team.teamId }));

    const members = await testPrisma.teamMember.findMany({ where: { deletedAt: null } });
    expect(members).toHaveLength(0);
    // Person should still exist (not deleted)
    const persons = await testPrisma.person.findMany({ where: { deletedAt: null } });
    expect(persons).toHaveLength(1);
  });

  // Can't delete nothing — you have to actually select a team first.
  test("throws when no teamID provided", async () => {
    expect(await removeTeam(formData({}))).toMatchObject({
      error: expect.stringContaining("No teamID selected"),
    });
  });

  // Team IDs are UUIDs — random strings won't fly.
  test("throws on invalid UUID", async () => {
    expect(await removeTeam(formData({ teamID: "invalid" }))).toMatchObject({
      error: expect.stringContaining("Invalid teamID format"),
    });
  });
});

describe("addManager", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Assign a person as the team's manager and verify it sticks.
  test("assigns a manager to a team", async () => {
    const person = await createTestPerson({ name: "Manager", email: "mgr@test.com" });
    const team = await createTestTeam({ teamName: "Team A" });

    await addManager(formData({ teamID: team.teamId, personID: person.id }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.teamManagerId).toBe(person.id);
  });

  // When you make someone the manager, they should also become a team member
  // automatically — a manager who's not on the team doesn't make sense.
  test("adds manager as team member if not already a member", async () => {
    const person = await createTestPerson({ name: "Manager", email: "mgr@test.com" });
    const team = await createTestTeam({ teamName: "Team A" });

    await addManager(formData({ teamID: team.teamId, personID: person.id }));

    const members = await testPrisma.teamMember.findMany({
      where: { teamId: team.teamId },
    });
    expect(members).toHaveLength(1);
    expect(members[0].personId).toBe(person.id);
  });

  // If the new manager is already on the team, don't add them twice.
  // The membership table has a unique constraint on (personId, teamId).
  test("does not duplicate membership if manager is already a member", async () => {
    const person = await createTestPerson({ name: "Manager", email: "mgr@test.com" });
    const team = await createTestTeam({ teamName: "Team A" });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    await addManager(formData({ teamID: team.teamId, personID: person.id }));

    const members = await testPrisma.teamMember.findMany({
      where: { teamId: team.teamId },
    });
    expect(members).toHaveLength(1);
  });

  // You have to say which team gets the manager.
  test("throws when no teamID provided", async () => {
    expect(
      await addManager(formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).toMatchObject({ error: expect.stringContaining("No teamID selected") });
  });

  // You have to say who becomes the manager.
  test("throws when no personID provided", async () => {
    expect(
      await addManager(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).toMatchObject({ error: expect.stringContaining("No personID provided") });
  });

  // Garbage IDs get caught before they hit the database.
  test("throws on invalid UUID", async () => {
    expect(await addManager(formData({ teamID: "bad", personID: "bad" }))).toMatchObject({
      error: expect.stringContaining("Invalid"),
    });
  });

  // Can't assign a manager that doesn't exist in the person table.
  test("throws when person does not exist", async () => {
    const team = await createTestTeam({ teamName: "Team A" });
    expect(
      await addManager(
        formData({
          teamID: team.teamId,
          personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Person not found") });
  });

  // Can't assign a manager to a team that doesn't exist.
  test("throws when team does not exist", async () => {
    const person = await createTestPerson({ name: "Alice" });
    expect(
      await addManager(
        formData({
          teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          personID: person.id,
        }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Team not found") });
  });
});

describe("addMember", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Add a person to a team and check the membership record exists.
  test("adds a person as a team member", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const team = await createTestTeam({ teamName: "Team A" });

    await addMember(formData({ teamID: team.teamId, personID: person.id }));

    const members = await testPrisma.teamMember.findMany();
    expect(members).toHaveLength(1);
    expect(members[0].personId).toBe(person.id);
    expect(members[0].teamId).toBe(team.teamId);
  });

  // You can't add the same person to the same team twice.
  // The function checks for this and throws a clear error.
  test("throws on duplicate membership", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const team = await createTestTeam({ teamName: "Team A" });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    expect(await addMember(formData({ teamID: team.teamId, personID: person.id }))).toMatchObject({
      error: expect.stringContaining("Person is already a member of the team"),
    });
  });

  // Have to specify which team to add the member to.
  test("throws when no teamID provided", async () => {
    expect(await addMember(formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }))).toEqual(
      { error: expect.stringContaining("No teamID selected") },
    );
  });

  // Have to specify which person to add.
  test("throws when no personID provided", async () => {
    expect(
      await addMember(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).toMatchObject({ error: expect.stringContaining("No personID selected") });
  });

  // UUID validation — same as every other action.
  test("throws on invalid UUID", async () => {
    expect(await addMember(formData({ teamID: "x", personID: "y" }))).toMatchObject({
      error: expect.stringContaining("Invalid"),
    });
  });
});

describe("removeMember", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Remove someone from a team. They still exist as a person, just not on this team anymore.
  test("removes a member from a team", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const team = await createTestTeam({ teamName: "Team A" });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    await removeMember(formData({ teamID: team.teamId, personID: person.id }));

    const members = await testPrisma.teamMember.findMany({ where: { deletedAt: null } });
    expect(members).toHaveLength(0);
  });

  // If you remove someone who was also the manager, the team's manager
  // should be set to null — you can't manage a team you're not on.
  test("unsets manager if removed member was the manager", async () => {
    const person = await createTestPerson({ name: "Manager", email: "mgr@test.com" });
    const team = await createTestTeam({ teamName: "Team A", teamManagerId: person.id });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    await removeMember(formData({ teamID: team.teamId, personID: person.id }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.teamManagerId).toBeNull();
  });

  // Removing a regular member should NOT affect the manager.
  // Only removing the manager themselves clears the manager field.
  test("does not unset manager if removed member is not the manager", async () => {
    const manager = await createTestPerson({ name: "Manager", email: "mgr@test.com" });
    const member = await createTestPerson({ name: "Member", email: "member@test.com" });
    const team = await createTestTeam({ teamName: "Team A", teamManagerId: manager.id });
    await testPrisma.teamMember.create({
      data: { personId: manager.id, teamId: team.teamId },
    });
    await testPrisma.teamMember.create({
      data: { personId: member.id, teamId: team.teamId },
    });

    await removeMember(formData({ teamID: team.teamId, personID: member.id }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.teamManagerId).toBe(manager.id);
  });

  // Can't remove someone who isn't on the team in the first place.
  test("throws if person is not a member", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const team = await createTestTeam({ teamName: "Team A" });

    expect(
      await removeMember(formData({ teamID: team.teamId, personID: person.id })),
    ).toMatchObject({ error: expect.stringContaining("Person is not a member of the team") });
  });

  // Need to know which team to remove the member from.
  test("throws when no teamID provided", async () => {
    expect(
      await removeMember(formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).toMatchObject({ error: expect.stringContaining("No teamID selected") });
  });

  // Need to know which person to remove.
  test("throws when no personID provided", async () => {
    expect(
      await removeMember(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).toMatchObject({ error: expect.stringContaining("No personID selected") });
  });

  // UUID check — keeps bad data out.
  test("throws on invalid UUID", async () => {
    expect(await removeMember(formData({ teamID: "x", personID: "y" }))).toMatchObject({
      error: expect.stringContaining("Invalid"),
    });
  });
});

describe("addManager (extended)", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Sets a person as manager of a single team.
  test("sets person as manager of a team", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const team = await createTestTeam({ teamName: "Engineering" });

    await addManager(formData({ personID: person.id, teamID: team.teamId }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.teamManagerId).toBe(person.id);
  });

  // Automatically adds manager as team member if not already a member.
  test("adds manager as team member if not already a member", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const team = await createTestTeam({ teamName: "Engineering" });

    await addManager(formData({ personID: person.id, teamID: team.teamId }));

    const membership = await testPrisma.teamMember.findFirst({
      where: { personId: person.id, teamId: team.teamId },
    });
    expect(membership).not.toBeNull();
  });

  // Sets a person as manager of MULTIPLE teams in one call (M8 fix verification).
  test("sets person as manager of multiple teams simultaneously", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const team1 = await createTestTeam({ teamName: "Team A" });
    const team2 = await createTestTeam({ teamName: "Team B" });
    const team3 = await createTestTeam({ teamName: "Team C" });

    await addManager(
      formData({ personID: person.id, teamID: [team1.teamId, team2.teamId, team3.teamId] }),
    );

    const t1 = await testPrisma.team.findUnique({ where: { teamId: team1.teamId } });
    const t2 = await testPrisma.team.findUnique({ where: { teamId: team2.teamId } });
    const t3 = await testPrisma.team.findUnique({ where: { teamId: team3.teamId } });
    expect(t1!.teamManagerId).toBe(person.id);
    expect(t2!.teamManagerId).toBe(person.id);
    expect(t3!.teamManagerId).toBe(person.id);

    // Should also be added as member to all three teams
    const memberships = await testPrisma.teamMember.findMany({
      where: { personId: person.id },
    });
    expect(memberships).toHaveLength(3);
  });

  // Does not duplicate team membership if person is already a member.
  test("does not duplicate membership if person is already a member", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const team = await createTestTeam({ teamName: "Engineering" });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    await addManager(formData({ personID: person.id, teamID: team.teamId }));

    const memberships = await testPrisma.teamMember.findMany({
      where: { personId: person.id, teamId: team.teamId },
    });
    expect(memberships).toHaveLength(1);
  });

  // Restores soft-deleted team membership when setting as manager.
  test("restores soft-deleted membership when setting as manager", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const team = await createTestTeam({ teamName: "Engineering" });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId, deletedAt: new Date() },
    });

    await addManager(formData({ personID: person.id, teamID: team.teamId }));

    const membership = await testPrisma.teamMember.findFirst({
      where: { personId: person.id, teamId: team.teamId },
    });
    expect(membership!.deletedAt).toBeNull();
  });

  // Throws when no teamID is provided.
  test("throws when no teamID provided", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    expect(await addManager(formData({ personID: person.id }))).toMatchObject({
      error: expect.stringContaining("No teamID selected"),
    });
  });

  // Throws when no personID is provided.
  test("throws when no personID provided", async () => {
    const team = await createTestTeam({ teamName: "Eng" });
    expect(await addManager(formData({ teamID: team.teamId }))).toMatchObject({
      error: expect.stringContaining("No personID provided"),
    });
  });

  // Throws when person does not exist.
  test("throws when person does not exist", async () => {
    const team = await createTestTeam({ teamName: "Eng" });
    expect(
      await addManager(
        formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", teamID: team.teamId }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Person not found") });
  });

  // Throws when team does not exist.
  test("throws when team does not exist", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    expect(
      await addManager(
        formData({ personID: person.id, teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Team not found") });
  });

  // Throws on invalid UUID for teamID.
  test("throws on invalid teamID format", async () => {
    expect(
      await addManager(
        formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", teamID: "bad-id" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Invalid teamID format") });
  });

  // Throws on invalid UUID for personID.
  test("throws on invalid personID format", async () => {
    expect(
      await addManager(
        formData({ personID: "bad-id", teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Invalid personID format") });
  });
});

afterAll(() => testPrisma.$disconnect());
