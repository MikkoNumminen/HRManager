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

// Mock @/mongoDb — exportAuditLogsCsv dynamically imports this.
// Use globalThis pattern so test code can share the collection reference.
jest.mock("@/mongoDb", () => ({
  getAuditLogCollection: () => (globalThis as Record<string, unknown>).__testAuditLogCollection,
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
  createPerson,
  removePerson,
  updatePosition,
  updateEmail,
  addManager,
  addMember,
  createTeam,
  removeTeam,
  removeMember,
  createDepartment,
  removeDepartment,
  updateDepartment,
  updatePersonName,
  updateTeamName,
  updateDepartmentHead,
  assignTeamToDepartment,
  removeTeamFromDepartment,
  resetAll,
  seedMockData,
  initializePermissions,
  updateUserRole,
  updateUserPermission,
  kickOutUser,
  updateProfileName,
  updateProfileImage,
  importPersonsCsv,
  exportPersonsCsv,
  exportTeamsCsv,
  exportDepartmentsCsv,
  exportAuditLogsCsv,
} from "@/serverActions";

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

describe("createPerson", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // The happy path: give it a name and email, check it actually ends up in the database.
  test("creates a person with name and email", async () => {
    await createPerson(formData({ name: "Alice", email: "alice@test.com" }));

    const persons = await testPrisma.person.findMany();
    expect(persons).toHaveLength(1);
    expect(persons[0].name).toBe("Alice");
    expect(persons[0].email).toBe("alice@test.com");
  });

  // If someone types "  Bob  " with extra spaces, we should store "Bob".
  test("trims whitespace from name", async () => {
    await createPerson(formData({ name: "  Bob  ", email: "bob@test.com" }));

    const [person] = await testPrisma.person.findMany();
    expect(person.name).toBe("Bob");
    expect(person.email).toBe("bob@test.com");
  });

  // You can't add a person with no name — that's just a blank row.
  test("throws on empty name", async () => {
    await expect(createPerson(formData({ name: "", email: "x@test.com" }))).rejects.toThrow(
      "Invalid Name",
    );
  });

  // Spaces don't count as a name either. Nice try though.
  test("throws on whitespace-only name", async () => {
    await expect(createPerson(formData({ name: "   ", email: "x@test.com" }))).rejects.toThrow(
      "Invalid Name",
    );
  });

  // Email is required — we use it as a unique identifier and for contact info.
  test("throws on missing email", async () => {
    await expect(createPerson(formData({ name: "Alice" }))).rejects.toThrow("Email is required");
  });

  // An empty string is not an email address.
  test("throws on empty email", async () => {
    await expect(createPerson(formData({ name: "Alice", email: "" }))).rejects.toThrow(
      "Email is required",
    );
  });

  // "not-an-email" doesn't have an @ sign — the regex catches this.
  test("throws on invalid email format", async () => {
    await expect(createPerson(formData({ name: "Alice", email: "not-an-email" }))).rejects.toThrow(
      "Invalid email format",
    );
  });

  // Two people can't share the same email — the database enforces uniqueness,
  // but we check first to give a friendly error message.
  test("throws on duplicate email", async () => {
    await createPerson(formData({ name: "Alice", email: "dup@test.com" }));
    await expect(createPerson(formData({ name: "Bob", email: "dup@test.com" }))).rejects.toThrow(
      "A person with this email already exists",
    );
  });

  // When you first create someone, they don't have a job title yet — position starts as null.
  test("sets position to null by default", async () => {
    await createPerson(formData({ name: "Alice", email: "alice@test.com" }));

    const [person] = await testPrisma.person.findMany();
    expect(person.position).toBeNull();
  });

  // Names longer than 255 characters are rejected to prevent abuse and DB bloat.
  test("throws when name exceeds max length", async () => {
    const longName = "A".repeat(256);
    await expect(
      createPerson(formData({ name: longName, email: "long@test.com" })),
    ).rejects.toThrow("characters or less");
  });

  // Email addresses longer than 320 characters are rejected.
  test("throws when email exceeds max length", async () => {
    const longEmail = "a".repeat(315) + "@test.com";
    await expect(createPerson(formData({ name: "Alice", email: longEmail }))).rejects.toThrow(
      "characters or less",
    );
  });
});

describe("removePerson", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Delete a person and verify they're actually gone from the database.
  test("removes a person by ID", async () => {
    const person = await testPrisma.person.create({
      data: { name: "ToRemove", email: "remove@test.com" },
    });

    await removePerson(formData({ personID: person.id }));
    // Record still exists but is soft-deleted
    const remaining = await testPrisma.person.findMany({ where: { deletedAt: null } });
    expect(remaining).toHaveLength(0);
    const softDeleted = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(softDeleted!.deletedAt).not.toBeNull();
  });

  // If someone is on a team and gets deleted, their team membership
  // is also soft-deleted — the records are preserved for audit history.
  test("removes person's team memberships before deleting", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Member", email: "member@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team A" },
    });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    await removePerson(formData({ personID: person.id }));

    const members = await testPrisma.teamMember.findMany({ where: { deletedAt: null } });
    expect(members).toHaveLength(0);
    const persons = await testPrisma.person.findMany({ where: { deletedAt: null } });
    expect(persons).toHaveLength(0);
  });

  // You can select multiple people and delete them all at once.
  // The form sends multiple values under the same "personID" key.
  test("removes multiple persons at once", async () => {
    const p1 = await testPrisma.person.create({
      data: { name: "One", email: "one@test.com" },
    });
    const p2 = await testPrisma.person.create({
      data: { name: "Two", email: "two@test.com" },
    });

    await removePerson(formData({ personID: [p1.id, p2.id] }));
    const remaining = await testPrisma.person.findMany({ where: { deletedAt: null } });
    expect(remaining).toHaveLength(0);
  });

  // If the form is submitted without selecting anyone, we should get a clear error.
  test("throws when no personID provided", async () => {
    await expect(removePerson(formData({}))).rejects.toThrow("No personID selected");
  });

  // IDs have to be valid UUIDs — this stops someone from injecting garbage into the query.
  test("throws on invalid UUID", async () => {
    await expect(removePerson(formData({ personID: "bad-id" }))).rejects.toThrow(
      "Invalid personID format",
    );
  });
});

describe("updatePersonName", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Change someone's name and verify the database actually saved it.
  test("updates a person's name", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });

    await updatePersonName(formData({ personID: person.id, name: "Alicia" }));

    const updated = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(updated!.name).toBe("Alicia");
  });

  // We need to know WHOSE name to update — can't do it without an ID.
  test("throws when no personID provided", async () => {
    await expect(updatePersonName(formData({ name: "Bob" }))).rejects.toThrow(
      "No personID provided",
    );
  });

  // The ID has to be a proper UUID, not some random string.
  test("throws on invalid UUID", async () => {
    await expect(updatePersonName(formData({ personID: "bad", name: "Bob" }))).rejects.toThrow(
      "Invalid personID format",
    );
  });

  // You can't set someone's name to nothing — names are required.
  test("throws when name is empty", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await expect(updatePersonName(formData({ personID: person.id, name: "" }))).rejects.toThrow(
      "New name is missing",
    );
  });

  // Attempting to update a non-existent person throws a clear error.
  test("throws when person does not exist", async () => {
    await expect(
      updatePersonName(formData({ personID: "00000000-0000-0000-0000-000000000000", name: "Bob" })),
    ).rejects.toThrow("Person not found");
  });

  // Names longer than 255 characters are rejected.
  test("throws when name exceeds max length", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const longName = "A".repeat(256);
    await expect(
      updatePersonName(formData({ personID: person.id, name: longName })),
    ).rejects.toThrow("characters or less");
  });
});

describe("updatePosition", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Change someone's job title and verify the database actually saved it.
  test("updates a person's position", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });

    await updatePosition(formData({ personID: person.id, name: "Senior Dev" }));

    const updated = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(updated!.position).toBe("Senior Dev");
  });

  // We need to know WHOSE position to update — can't do it without an ID.
  test("throws when no personID provided", async () => {
    await expect(updatePosition(formData({ name: "Dev" }))).rejects.toThrow("No personID provided");
  });

  // The ID has to be a proper UUID, not some random string.
  test("throws on invalid UUID", async () => {
    await expect(updatePosition(formData({ personID: "bad", name: "Dev" }))).rejects.toThrow(
      "Invalid personID format",
    );
  });

  // You can't set someone's position to nothing — that's what null is for,
  // and there's no UI flow for deliberately blanking out a position.
  test("throws when position is empty", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await expect(updatePosition(formData({ personID: person.id, name: "" }))).rejects.toThrow(
      "New position is missing",
    );
  });

  // Attempting to update a non-existent person throws a clear error.
  test("throws when person does not exist", async () => {
    await expect(
      updatePosition(formData({ personID: "00000000-0000-0000-0000-000000000000", name: "Dev" })),
    ).rejects.toThrow("Person not found");
  });

  // Position strings longer than 255 characters are rejected.
  test("throws when position exceeds max length", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const longPosition = "A".repeat(256);
    await expect(
      updatePosition(formData({ personID: person.id, name: longPosition })),
    ).rejects.toThrow("characters or less");
  });

  // Accepts "position" as the form data key (alternative to "name").
  test("reads position from 'position' form data key", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });

    await updatePosition(formData({ personID: person.id, position: "Lead Dev" }));

    const updated = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(updated!.position).toBe("Lead Dev");
  });
});

describe("updateEmail", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Change someone's email and make sure the new one is saved.
  test("updates a person's email", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "old@test.com" },
    });

    await updateEmail(formData({ personID: person.id, name: "new@test.com" }));

    const updated = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(updated!.email).toBe("new@test.com");
  });

  // Can't change your email to one that someone else already has.
  // Email is unique across the whole system.
  test("throws on duplicate email", async () => {
    const p1 = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await testPrisma.person.create({
      data: { name: "Bob", email: "taken@test.com" },
    });

    await expect(
      updateEmail(formData({ personID: p1.id, name: "taken@test.com" })),
    ).rejects.toThrow("A person with this email already exists");
  });

  // The new email has to actually look like an email address.
  test("throws on invalid email format", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await expect(updateEmail(formData({ personID: person.id, name: "not-valid" }))).rejects.toThrow(
      "Invalid email format",
    );
  });

  // You can't update to an empty email — if you want to remove it,
  // that would need a different operation entirely.
  test("throws when email is empty", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await expect(updateEmail(formData({ personID: person.id, name: "" }))).rejects.toThrow(
      "New Email is missing",
    );
  });

  // Need to know whose email to update — can't do it without an ID.
  test("throws when no personID provided", async () => {
    await expect(updateEmail(formData({ name: "a@b.com" }))).rejects.toThrow(
      "No personID selected",
    );
  });

  // Same UUID check as everywhere else — no garbage IDs allowed.
  test("throws on invalid UUID", async () => {
    await expect(updateEmail(formData({ personID: "nope", name: "a@b.com" }))).rejects.toThrow(
      "Invalid personID format",
    );
  });

  // Attempting to update email on a non-existent person throws a clear error.
  test("throws when person does not exist", async () => {
    await expect(
      updateEmail(
        formData({ personID: "00000000-0000-0000-0000-000000000000", name: "new@test.com" }),
      ),
    ).rejects.toThrow("Person not found");
  });

  // Email addresses longer than 320 characters are rejected.
  test("throws when email exceeds max length", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const longEmail = "a".repeat(315) + "@test.com";
    await expect(updateEmail(formData({ personID: person.id, name: longEmail }))).rejects.toThrow(
      "characters or less",
    );
  });
});

describe("createTeam", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

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
    await expect(createTeam(formData({ name: "" }))).rejects.toThrow("Invalid Name");
  });

  // Spaces alone don't count as a team name, just like with person names.
  test("throws on whitespace-only name", async () => {
    await expect(createTeam(formData({ name: "   " }))).rejects.toThrow("Invalid Name");
  });

  // Team names have a length limit to prevent abuse.
  test("throws when team name exceeds max length", async () => {
    const longName = "A".repeat(256);
    await expect(createTeam(formData({ name: longName }))).rejects.toThrow("characters or less");
  });
});

describe("updateTeamName", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Rename a team and verify the database actually saved it.
  test("renames a team", async () => {
    const team = await testPrisma.team.create({
      data: { teamName: "Engineering" },
    });

    await updateTeamName(formData({ teamID: team.teamId, name: "Platform" }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.teamName).toBe("Platform");
  });

  // We need to know WHICH team to rename — can't do it without an ID.
  test("throws when no teamID provided", async () => {
    await expect(updateTeamName(formData({ name: "New Name" }))).rejects.toThrow(
      "No teamID provided",
    );
  });

  // The ID has to be a proper UUID, not some random string.
  test("throws on invalid UUID", async () => {
    await expect(updateTeamName(formData({ teamID: "bad", name: "New Name" }))).rejects.toThrow(
      "Invalid teamID format",
    );
  });

  // You can't set a team's name to nothing — names are required.
  test("throws when name is empty", async () => {
    const team = await testPrisma.team.create({
      data: { teamName: "Engineering" },
    });
    await expect(updateTeamName(formData({ teamID: team.teamId, name: "" }))).rejects.toThrow(
      "New team name is missing",
    );
  });

  // Team names have a length limit.
  test("throws when new name exceeds max length", async () => {
    const team = await testPrisma.team.create({ data: { teamName: "Eng" } });
    const longName = "A".repeat(256);
    await expect(updateTeamName(formData({ teamID: team.teamId, name: longName }))).rejects.toThrow(
      "characters or less",
    );
  });

  // Can't rename a team that doesn't exist.
  test("throws when team does not exist", async () => {
    await expect(
      updateTeamName(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", name: "New" })),
    ).rejects.toThrow("Team not found");
  });
});

describe("removeTeam", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Delete a team and confirm it's soft-deleted.
  test("removes a team", async () => {
    const team = await testPrisma.team.create({
      data: { teamName: "To Delete" },
    });

    await removeTeam(formData({ teamID: team.teamId }));
    const teams = await testPrisma.team.findMany({ where: { deletedAt: null } });
    expect(teams).toHaveLength(0);
  });

  // When a team is soft-deleted, all its membership records are also
  // soft-deleted. But the people themselves should still exist —
  // deleting a team doesn't fire the employees!
  test("cascade deletes team members when team is removed", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "To Delete" },
    });
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
    await expect(removeTeam(formData({}))).rejects.toThrow("No teamID selected");
  });

  // Team IDs are UUIDs — random strings won't fly.
  test("throws on invalid UUID", async () => {
    await expect(removeTeam(formData({ teamID: "invalid" }))).rejects.toThrow(
      "Invalid teamID format",
    );
  });
});

describe("addManager", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Assign a person as the team's manager and verify it sticks.
  test("assigns a manager to a team", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Manager", email: "mgr@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team A" },
    });

    await addManager(formData({ teamID: team.teamId, personID: person.id }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.teamManagerId).toBe(person.id);
  });

  // When you make someone the manager, they should also become a team member
  // automatically — a manager who's not on the team doesn't make sense.
  test("adds manager as team member if not already a member", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Manager", email: "mgr@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team A" },
    });

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
    const person = await testPrisma.person.create({
      data: { name: "Manager", email: "mgr@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team A" },
    });
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
    await expect(
      addManager(formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No teamID selected");
  });

  // You have to say who becomes the manager.
  test("throws when no personID provided", async () => {
    await expect(
      addManager(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No personID provided");
  });

  // Garbage IDs get caught before they hit the database.
  test("throws on invalid UUID", async () => {
    await expect(addManager(formData({ teamID: "bad", personID: "bad" }))).rejects.toThrow(
      "Invalid",
    );
  });

  // Can't assign a manager that doesn't exist in the person table.
  test("throws when person does not exist", async () => {
    const team = await testPrisma.team.create({ data: { teamName: "Team A" } });
    await expect(
      addManager(
        formData({
          teamID: team.teamId,
          personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        }),
      ),
    ).rejects.toThrow("Person not found");
  });

  // Can't assign a manager to a team that doesn't exist.
  test("throws when team does not exist", async () => {
    const person = await testPrisma.person.create({ data: { name: "Alice" } });
    await expect(
      addManager(
        formData({
          teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          personID: person.id,
        }),
      ),
    ).rejects.toThrow("Team not found");
  });
});

describe("addMember", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Add a person to a team and check the membership record exists.
  test("adds a person as a team member", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team A" },
    });

    await addMember(formData({ teamID: team.teamId, personID: person.id }));

    const members = await testPrisma.teamMember.findMany();
    expect(members).toHaveLength(1);
    expect(members[0].personId).toBe(person.id);
    expect(members[0].teamId).toBe(team.teamId);
  });

  // You can't add the same person to the same team twice.
  // The function checks for this and throws a clear error.
  test("throws on duplicate membership", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team A" },
    });
    await testPrisma.teamMember.create({
      data: { personId: person.id, teamId: team.teamId },
    });

    await expect(addMember(formData({ teamID: team.teamId, personID: person.id }))).rejects.toThrow(
      "Person is already a member of the team",
    );
  });

  // Have to specify which team to add the member to.
  test("throws when no teamID provided", async () => {
    await expect(
      addMember(formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No teamID selected");
  });

  // Have to specify which person to add.
  test("throws when no personID provided", async () => {
    await expect(
      addMember(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No personID selected");
  });

  // UUID validation — same as every other action.
  test("throws on invalid UUID", async () => {
    await expect(addMember(formData({ teamID: "x", personID: "y" }))).rejects.toThrow("Invalid");
  });
});

describe("removeMember", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Remove someone from a team. They still exist as a person, just not on this team anymore.
  test("removes a member from a team", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team A" },
    });
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
    const person = await testPrisma.person.create({
      data: { name: "Manager", email: "mgr@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team A", teamManagerId: person.id },
    });
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
    const manager = await testPrisma.person.create({
      data: { name: "Manager", email: "mgr@test.com" },
    });
    const member = await testPrisma.person.create({
      data: { name: "Member", email: "member@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team A", teamManagerId: manager.id },
    });
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
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team A" },
    });

    await expect(
      removeMember(formData({ teamID: team.teamId, personID: person.id })),
    ).rejects.toThrow("Person is not a member of the team");
  });

  // Need to know which team to remove the member from.
  test("throws when no teamID provided", async () => {
    await expect(
      removeMember(formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No teamID selected");
  });

  // Need to know which person to remove.
  test("throws when no personID provided", async () => {
    await expect(
      removeMember(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No personID selected");
  });

  // UUID check — keeps bad data out.
  test("throws on invalid UUID", async () => {
    await expect(removeMember(formData({ teamID: "x", personID: "y" }))).rejects.toThrow("Invalid");
  });
});

describe("resetAll", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // The nuclear option: wipe everything — all people, all teams, all memberships.
  // Used for starting fresh. Verify every table is empty afterward.
  test("deletes all persons, teams, and team members", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Team A" },
    });
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
    await expect(resetAll()).resolves.not.toThrow();
  });
});

describe("updateUserRole", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

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

    await expect(updateUserRole(formData({ userId: user.id, role: "superuser" }))).rejects.toThrow(
      "Invalid role",
    );
  });

  // Can't change the superuser's role — it's permanent and locked.
  test("throws when trying to change the superuser's role", async () => {
    const user = await testPrisma.user.create({
      data: { email: "super@test.com", name: "Super", role: "superuser" },
    });

    await expect(updateUserRole(formData({ userId: user.id, role: "user" }))).rejects.toThrow(
      "Cannot change the superuser's role",
    );
  });

  // Can't update a user that doesn't exist.
  test("throws when user not found", async () => {
    await expect(
      updateUserRole(formData({ userId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", role: "user" })),
    ).rejects.toThrow("User not found");
  });

  // UUID validation — garbage IDs get caught early.
  test("throws on invalid UUID", async () => {
    await expect(updateUserRole(formData({ userId: "bad-id", role: "user" }))).rejects.toThrow(
      "Invalid userId format",
    );
  });

  // Both fields are required — no partial submissions.
  test("throws when userId is missing", async () => {
    await expect(updateUserRole(formData({ role: "user" }))).rejects.toThrow("No userId provided");
  });

  // Role field is also required.
  test("throws when role is missing", async () => {
    await expect(
      updateUserRole(formData({ userId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No role provided");
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
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

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

    await expect(
      updateUserPermission(
        formData({ userId: user.id, permissionKey: "person:create", action: "grant" }),
      ),
    ).rejects.toThrow("Cannot modify superuser permissions");
  });

  // Can't modify permissions for a user that doesn't exist.
  test("throws when user not found", async () => {
    await testPrisma.permission.create({
      data: { key: "person:create", description: "Create persons" },
    });

    await expect(
      updateUserPermission(
        formData({
          userId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          permissionKey: "person:create",
          action: "grant",
        }),
      ),
    ).rejects.toThrow("User not found");
  });

  // Can't grant a permission that doesn't exist in the catalog.
  test("throws when permission key not found", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });

    await expect(
      updateUserPermission(
        formData({ userId: user.id, permissionKey: "fake:permission", action: "grant" }),
      ),
    ).rejects.toThrow("Permission not found");
  });

  // UUID validation on the userId field.
  test("throws on invalid UUID", async () => {
    await expect(
      updateUserPermission(
        formData({ userId: "bad", permissionKey: "person:create", action: "grant" }),
      ),
    ).rejects.toThrow("Invalid userId format");
  });

  // All three required fields must be present — no partial submissions.
  test("throws when userId is missing", async () => {
    await expect(
      updateUserPermission(formData({ permissionKey: "person:create", action: "grant" })),
    ).rejects.toThrow("No userId provided");
  });

  // Permission key is required.
  test("throws when permissionKey is missing", async () => {
    await expect(
      updateUserPermission(
        formData({ userId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", action: "grant" }),
      ),
    ).rejects.toThrow("No permissionKey provided");
  });

  // Action is required.
  test("throws when action is missing", async () => {
    await expect(
      updateUserPermission(
        formData({
          userId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          permissionKey: "person:create",
        }),
      ),
    ).rejects.toThrow("No action provided");
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
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Seeds 6 persons into the database.
  test("creates 6 persons", async () => {
    await seedMockData();

    const persons = await testPrisma.person.findMany();
    expect(persons).toHaveLength(6);
  });

  // Seeds 3 teams with the correct names.
  test("creates 3 teams", async () => {
    await seedMockData();

    const teams = await testPrisma.team.findMany({ orderBy: { teamName: "asc" } });
    expect(teams).toHaveLength(3);
    expect(teams.map((t) => t.teamName)).toEqual(["Design", "Engineering", "Platform"]);
  });

  // Seeds team memberships — 7 total across the three teams.
  test("creates team memberships", async () => {
    await seedMockData();

    const members = await testPrisma.teamMember.findMany();
    expect(members).toHaveLength(7);
  });

  // Assigns managers to all three teams.
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
    expect(platform!.manager!.name).toBe("Dave Martinez");
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
    expect(persons).toHaveLength(6);
    const teams = await testPrisma.team.findMany();
    expect(teams).toHaveLength(3);
    const users = await testPrisma.user.findMany();
    expect(users).toHaveLength(4);
  });

  // With clearExisting=false, existing data should be preserved alongside seeded data.
  test("preserves existing data when clearExisting is false", async () => {
    await testPrisma.person.create({
      data: { name: "Pre-existing", email: "existing@test.com" },
    });

    await seedMockData(false);

    const persons = await testPrisma.person.findMany();
    expect(persons).toHaveLength(7); // 6 seeded + 1 pre-existing
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
    expect(persons).toHaveLength(6);
  });
});

describe("initializePermissions", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Calls seedPermissions (mocked) — verifies the function runs without error.
  test("calls seedPermissions successfully", async () => {
    const { seedPermissions } = require("@/permissions");
    await initializePermissions();
    expect(seedPermissions).toHaveBeenCalled();
  });
});

describe("addManager", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Sets a person as manager of a single team.
  test("sets person as manager of a team", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Engineering" },
    });

    await addManager(formData({ personID: person.id, teamID: team.teamId }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.teamManagerId).toBe(person.id);
  });

  // Automatically adds manager as team member if not already a member.
  test("adds manager as team member if not already a member", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Engineering" },
    });

    await addManager(formData({ personID: person.id, teamID: team.teamId }));

    const membership = await testPrisma.teamMember.findFirst({
      where: { personId: person.id, teamId: team.teamId },
    });
    expect(membership).not.toBeNull();
  });

  // Sets a person as manager of MULTIPLE teams in one call (M8 fix verification).
  test("sets person as manager of multiple teams simultaneously", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const team1 = await testPrisma.team.create({ data: { teamName: "Team A" } });
    const team2 = await testPrisma.team.create({ data: { teamName: "Team B" } });
    const team3 = await testPrisma.team.create({ data: { teamName: "Team C" } });

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
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Engineering" },
    });
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
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Engineering" },
    });
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
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await expect(addManager(formData({ personID: person.id }))).rejects.toThrow(
      "No teamID selected",
    );
  });

  // Throws when no personID is provided.
  test("throws when no personID provided", async () => {
    const team = await testPrisma.team.create({ data: { teamName: "Eng" } });
    await expect(addManager(formData({ teamID: team.teamId }))).rejects.toThrow(
      "No personID provided",
    );
  });

  // Throws when person does not exist.
  test("throws when person does not exist", async () => {
    const team = await testPrisma.team.create({ data: { teamName: "Eng" } });
    await expect(
      addManager(
        formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", teamID: team.teamId }),
      ),
    ).rejects.toThrow("Person not found");
  });

  // Throws when team does not exist.
  test("throws when team does not exist", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await expect(
      addManager(formData({ personID: person.id, teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("Team not found");
  });

  // Throws on invalid UUID for teamID.
  test("throws on invalid teamID format", async () => {
    await expect(
      addManager(formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", teamID: "bad-id" })),
    ).rejects.toThrow("Invalid teamID format");
  });

  // Throws on invalid UUID for personID.
  test("throws on invalid personID format", async () => {
    await expect(
      addManager(formData({ personID: "bad-id", teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("Invalid personID format");
  });
});

describe("createDepartment", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Creates a department with name and description.
  test("creates a department with name and description", async () => {
    await createDepartment(formData({ name: "Engineering", description: "Dev team" }));
    const departments = await testPrisma.department.findMany();
    expect(departments).toHaveLength(1);
    expect(departments[0].name).toBe("Engineering");
    expect(departments[0].description).toBe("Dev team");
  });

  // Creates a department with name only (description is optional).
  test("creates a department without description", async () => {
    await createDepartment(formData({ name: "Product" }));
    const departments = await testPrisma.department.findMany();
    expect(departments).toHaveLength(1);
    expect(departments[0].description).toBeNull();
  });

  // Throws when name is empty.
  test("throws on empty name", async () => {
    await expect(createDepartment(formData({ name: "" }))).rejects.toThrow("Invalid Name");
  });

  // Throws when name is missing.
  test("throws on missing name", async () => {
    await expect(createDepartment(formData({}))).rejects.toThrow("Invalid Name");
  });

  // Department names have a length limit.
  test("throws when name exceeds max length", async () => {
    const longName = "A".repeat(256);
    await expect(createDepartment(formData({ name: longName }))).rejects.toThrow(
      "characters or less",
    );
  });

  // Department descriptions have a length limit.
  test("throws when description exceeds max length", async () => {
    const longDesc = "A".repeat(1001);
    await expect(
      createDepartment(formData({ name: "Eng", description: longDesc })),
    ).rejects.toThrow("characters or less");
  });
});

describe("removeDepartment", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Removes a department and unlinks its teams.
  test("removes department and unlinks teams", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Eng" } });
    await testPrisma.team.create({ data: { teamName: "Platform", departmentId: dept.id } });

    await removeDepartment(formData({ departmentID: dept.id }));

    const departments = await testPrisma.department.findMany({ where: { deletedAt: null } });
    expect(departments).toHaveLength(0);
    const team = await testPrisma.team.findFirst({
      where: { teamName: "Platform", deletedAt: null },
    });
    expect(team).not.toBeNull();
    expect(team!.departmentId).toBeNull();
  });

  // Throws when no departmentID is provided.
  test("throws on missing departmentID", async () => {
    await expect(removeDepartment(formData({}))).rejects.toThrow("No departmentID selected");
  });

  // Throws on invalid UUID.
  test("throws on invalid UUID", async () => {
    await expect(removeDepartment(formData({ departmentID: "bad" }))).rejects.toThrow(
      "Invalid departmentID format",
    );
  });
});

describe("updateDepartment", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Updates department name and description.
  test("updates department name and description", async () => {
    const dept = await testPrisma.department.create({
      data: { name: "Eng", description: "Old" },
    });
    await updateDepartment(
      formData({ departmentID: dept.id, name: "Engineering", description: "New desc" }),
    );
    const updated = await testPrisma.department.findUnique({ where: { id: dept.id } });
    expect(updated!.name).toBe("Engineering");
    expect(updated!.description).toBe("New desc");
  });

  // Throws when name is empty.
  test("throws on empty name", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Eng" } });
    await expect(updateDepartment(formData({ departmentID: dept.id, name: "" }))).rejects.toThrow(
      "Department name is required",
    );
  });

  // Throws when departmentID is missing.
  test("throws on missing departmentID", async () => {
    await expect(updateDepartment(formData({ name: "X" }))).rejects.toThrow(
      "No departmentID provided",
    );
  });

  // Department names have a length limit.
  test("throws when name exceeds max length", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Eng" } });
    const longName = "A".repeat(256);
    await expect(
      updateDepartment(formData({ departmentID: dept.id, name: longName })),
    ).rejects.toThrow("characters or less");
  });

  // Department descriptions have a length limit.
  test("throws when description exceeds max length", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Eng" } });
    const longDesc = "A".repeat(1001);
    await expect(
      updateDepartment(formData({ departmentID: dept.id, name: "Eng", description: longDesc })),
    ).rejects.toThrow("characters or less");
  });

  // Can't update a department that doesn't exist.
  test("throws when department does not exist", async () => {
    await expect(
      updateDepartment(
        formData({ departmentID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", name: "New" }),
      ),
    ).rejects.toThrow("Department not found");
  });
});

describe("updateDepartmentHead", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Sets the department head to a person.
  test("sets department head", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Eng" } });
    const person = await testPrisma.person.create({ data: { name: "Alice" } });

    await updateDepartmentHead(formData({ departmentID: dept.id, personID: person.id }));

    const updated = await testPrisma.department.findUnique({ where: { id: dept.id } });
    expect(updated!.headId).toBe(person.id);
  });

  // Clears the department head when personID is empty.
  test("clears department head when personID is empty", async () => {
    const person = await testPrisma.person.create({ data: { name: "Alice" } });
    const dept = await testPrisma.department.create({
      data: { name: "Eng", headId: person.id },
    });

    await updateDepartmentHead(formData({ departmentID: dept.id, personID: "" }));

    const updated = await testPrisma.department.findUnique({ where: { id: dept.id } });
    expect(updated!.headId).toBeNull();
  });

  // Throws when departmentID is missing.
  test("throws on missing departmentID", async () => {
    await expect(updateDepartmentHead(formData({}))).rejects.toThrow("No departmentID provided");
  });

  // Can't set a non-existent person as department head.
  test("throws when person does not exist", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Eng" } });
    await expect(
      updateDepartmentHead(
        formData({
          departmentID: dept.id,
          personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        }),
      ),
    ).rejects.toThrow("Person not found");
  });

  // Can't update head of a department that doesn't exist.
  test("throws when department does not exist", async () => {
    const person = await testPrisma.person.create({ data: { name: "Alice" } });
    await expect(
      updateDepartmentHead(
        formData({
          departmentID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          personID: person.id,
        }),
      ),
    ).rejects.toThrow("Department not found");
  });
});

describe("assignTeamToDepartment", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Assigns a team to a department.
  test("assigns a team to a department", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Eng" } });
    const team = await testPrisma.team.create({ data: { teamName: "Platform" } });

    await assignTeamToDepartment(formData({ departmentID: dept.id, teamID: team.teamId }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.departmentId).toBe(dept.id);
  });

  // Throws when departmentID is missing.
  test("throws on missing departmentID", async () => {
    await expect(
      assignTeamToDepartment(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No departmentID provided");
  });

  // Throws when teamID is missing.
  test("throws on missing teamID", async () => {
    await expect(
      assignTeamToDepartment(formData({ departmentID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No teamID provided");
  });

  // Can't assign a team to a department that doesn't exist.
  test("throws when department does not exist", async () => {
    const team = await testPrisma.team.create({ data: { teamName: "Platform" } });
    await expect(
      assignTeamToDepartment(
        formData({
          departmentID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          teamID: team.teamId,
        }),
      ),
    ).rejects.toThrow("Department not found");
  });

  // Can't assign a non-existent team to a department.
  test("throws when team does not exist", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Eng" } });
    await expect(
      assignTeamToDepartment(
        formData({
          departmentID: dept.id,
          teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        }),
      ),
    ).rejects.toThrow("Team not found");
  });
});

describe("removeTeamFromDepartment", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Removes a team from its department.
  test("removes a team from its department", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Eng" } });
    const team = await testPrisma.team.create({
      data: { teamName: "Platform", departmentId: dept.id },
    });

    await removeTeamFromDepartment(formData({ teamID: team.teamId }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.departmentId).toBeNull();
  });

  // Throws when teamID is missing.
  test("throws on missing teamID", async () => {
    await expect(removeTeamFromDepartment(formData({}))).rejects.toThrow("No teamID provided");
  });

  // Can't remove a team that doesn't exist from a department.
  test("throws when team does not exist", async () => {
    await expect(
      removeTeamFromDepartment(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("Team not found");
  });
});

describe("kickOutUser", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

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

    await expect(kickOutUser(formData({ userId: superuser.id }))).rejects.toThrow(
      "Cannot kick out the superuser",
    );

    // Verify user was not deleted
    const stillExists = await testPrisma.user.findUnique({ where: { id: superuser.id } });
    expect(stillExists).not.toBeNull();
  });

  // Throws when no userId is provided in the form data.
  test("throws on missing userId", async () => {
    await expect(kickOutUser(formData({}))).rejects.toThrow("No userId provided");
  });

  // Throws when the userId doesn't match any user in the database.
  test("throws on non-existent user", async () => {
    await expect(
      kickOutUser(formData({ userId: "00000000-0000-0000-0000-000000000000" })),
    ).rejects.toThrow("User not found");
  });

  // Throws when userId is not a valid UUID format.
  test("throws on invalid UUID", async () => {
    await expect(kickOutUser(formData({ userId: "not-a-uuid" }))).rejects.toThrow();
  });

  // Demo sessions cannot kick real OAuth users — only the demo user is allowed.
  test("throws when demo session tries to kick a non-demo user", async () => {
    mockGetDemoSessionId.mockResolvedValueOnce("demo-sess-123");
    const realUser = await testPrisma.user.create({
      data: { email: "real@oauth.com", name: "Real User", role: "user" },
    });

    await expect(kickOutUser(formData({ userId: realUser.id }))).rejects.toThrow(
      "Demo sessions cannot manage real users",
    );

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

    await expect(kickOutUser(formData({ userId: user.id }))).rejects.toThrow(
      "Cannot kick yourself out",
    );

    // Verify user was not deleted
    const stillExists = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(stillExists).not.toBeNull();
  });
});

describe("updateProfileName", () => {
  beforeEach(async () => {
    await cleanDb();
  });
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // The happy path: update the display name for the logged-in user.
  test("updates the user's display name", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await updateProfileName(formData({ name: "Alice Smith" }));
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.name).toBe("Alice Smith");
  });

  // Trims whitespace from the name before saving.
  test("trims whitespace from name", async () => {
    const user = await testPrisma.user.create({
      data: { email: "bob@test.com", name: "Bob", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await updateProfileName(formData({ name: "  Bob Williams  " }));
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.name).toBe("Bob Williams");
  });

  // An empty name should be rejected — display name is required.
  test("throws on empty name", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await expect(updateProfileName(formData({ name: "" }))).rejects.toThrow("Name is required");
  });

  // A whitespace-only name should also be rejected.
  test("throws on whitespace-only name", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await expect(updateProfileName(formData({ name: "   " }))).rejects.toThrow("Name is required");
  });

  // Names over the max length (255 chars) should be rejected.
  test("throws on name exceeding max length", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    const longName = "A".repeat(256);
    await expect(updateProfileName(formData({ name: longName }))).rejects.toThrow(
      "characters or less",
    );
  });

  // Unauthenticated users can't update a profile — no session, no go.
  test("throws when not authenticated", async () => {
    auth.mockResolvedValueOnce(null);
    await expect(updateProfileName(formData({ name: "Hacker" }))).rejects.toThrow(
      "Not authenticated",
    );
  });

  // Session with missing user id should also fail.
  test("throws when session has no user id", async () => {
    auth.mockResolvedValueOnce({ user: { email: "alice@test.com" } });
    await expect(updateProfileName(formData({ name: "Alice" }))).rejects.toThrow(
      "Not authenticated",
    );
  });

  // If the user has been deleted between session creation and profile update, fail gracefully.
  test("throws when user not found in database", async () => {
    auth.mockResolvedValueOnce({
      user: { id: "00000000-0000-0000-0000-000000000000", email: "ghost@test.com" },
    });
    await expect(updateProfileName(formData({ name: "Ghost" }))).rejects.toThrow("User not found");
  });

  // Missing name field in form data should be rejected.
  test("throws when name field is missing from form data", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await expect(updateProfileName(formData({}))).rejects.toThrow("Name is required");
  });
});

describe("updateProfileImage", () => {
  beforeEach(async () => {
    await cleanDb();
  });
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Set a custom profile picture URL and verify it saved.
  test("sets a custom profile image URL", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await updateProfileImage(formData({ image: "https://example.com/avatar.jpg" }));
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.image).toBe("https://example.com/avatar.jpg");
  });

  // Sending an empty string clears the custom image (reverts to OAuth avatar).
  test("clears the image when empty string is sent", async () => {
    const user = await testPrisma.user.create({
      data: {
        email: "alice@test.com",
        name: "Alice",
        image: "https://old.com/pic.jpg",
        role: "user",
      },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await updateProfileImage(formData({ image: "" }));
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.image).toBeNull();
  });

  // Whitespace-only should also clear the image.
  test("clears the image when whitespace-only string is sent", async () => {
    const user = await testPrisma.user.create({
      data: {
        email: "alice@test.com",
        name: "Alice",
        image: "https://old.com/pic.jpg",
        role: "user",
      },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await updateProfileImage(formData({ image: "   " }));
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.image).toBeNull();
  });

  // Trims whitespace from the URL before saving.
  test("trims whitespace from image URL", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await updateProfileImage(formData({ image: "  https://example.com/pic.png  " }));
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.image).toBe("https://example.com/pic.png");
  });

  // Only http and https URLs are allowed — no javascript: or ftp: schemes.
  test("rejects non-http/https protocols", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await expect(updateProfileImage(formData({ image: "javascript:alert(1)" }))).rejects.toThrow(
      "protocol",
    );
  });

  // ftp URLs should also be rejected.
  test("rejects ftp URLs", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await expect(
      updateProfileImage(formData({ image: "ftp://example.com/pic.jpg" })),
    ).rejects.toThrow("protocol");
  });

  // Completely invalid URLs that can't be parsed should be rejected.
  test("rejects invalid URL format", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await expect(updateProfileImage(formData({ image: "not a url" }))).rejects.toThrow(
      "Invalid URL format",
    );
  });

  // URLs over the max length (2048 chars) should be rejected.
  test("rejects URL exceeding max length", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    const longUrl = "https://example.com/" + "a".repeat(2040);
    await expect(updateProfileImage(formData({ image: longUrl }))).rejects.toThrow(
      "characters or less",
    );
  });

  // Unauthenticated users can't change profile pictures.
  test("throws when not authenticated", async () => {
    auth.mockResolvedValueOnce(null);
    await expect(
      updateProfileImage(formData({ image: "https://example.com/pic.jpg" })),
    ).rejects.toThrow("Not authenticated");
  });

  // If the user was deleted after login, fail gracefully.
  test("throws when user not found in database", async () => {
    auth.mockResolvedValueOnce({
      user: { id: "00000000-0000-0000-0000-000000000000", email: "ghost@test.com" },
    });
    await expect(
      updateProfileImage(formData({ image: "https://example.com/pic.jpg" })),
    ).rejects.toThrow("User not found");
  });

  // http URLs (not just https) should be accepted.
  test("accepts http URLs", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Alice", role: "user" },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await updateProfileImage(formData({ image: "http://example.com/pic.jpg" }));
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.image).toBe("http://example.com/pic.jpg");
  });

  // Missing image field should clear the image (treat as empty string).
  test("clears image when image field is missing from form data", async () => {
    const user = await testPrisma.user.create({
      data: {
        email: "alice@test.com",
        name: "Alice",
        image: "https://old.com/pic.jpg",
        role: "user",
      },
    });
    auth.mockResolvedValueOnce({ user: { id: user.id, email: user.email } });
    await updateProfileImage(formData({}));
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.image).toBeNull();
  });
});

describe("importPersonsCsv", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Helper to create a FormData with a File attached
  function importFormData(csvContent: string, filename = "test.csv"): FormData {
    const fd = new FormData();
    const file = new File([csvContent], filename, { type: "text/csv" });
    fd.append("file", file);
    return fd;
  }

  // Successfully imports valid persons from CSV
  test("imports valid persons from CSV", async () => {
    const csv = "name,email,position\nAlice,alice@test.com,Manager\nBob,bob@test.com,Developer";
    const result = await importPersonsCsv(null, importFormData(csv));

    expect(result.result).toBeDefined();
    expect(result.result!.imported).toBe(2);
    expect(result.result!.errors).toHaveLength(0);

    const persons = await testPrisma.person.findMany({ orderBy: { name: "asc" } });
    expect(persons).toHaveLength(2);
    expect(persons[0].name).toBe("Alice");
    expect(persons[0].position).toBe("Manager");
    expect(persons[1].name).toBe("Bob");
  });

  // Returns error when no file is provided
  test("returns error when no file is attached", async () => {
    const fd = new FormData();
    const result = await importPersonsCsv(null, fd);
    expect(result.error).toBe("Please select a CSV file");
  });

  // Returns error for non-CSV files
  test("returns error for non-CSV file extension", async () => {
    const fd = new FormData();
    fd.append("file", new File(["data"], "test.txt", { type: "text/plain" }));
    const result = await importPersonsCsv(null, fd);
    expect(result.error).toBe("File must be a .csv file");
  });

  // Returns error for oversized files
  test("returns error for file exceeding size limit", async () => {
    const fd = new FormData();
    const bigContent = "a".repeat(1024 * 1024 + 1);
    fd.append("file", new File([bigContent], "big.csv", { type: "text/csv" }));
    const result = await importPersonsCsv(null, fd);
    expect(result.error).toBe("File exceeds 1 MB limit");
  });

  // Returns error for CSV with only headers
  test("returns error for headers-only CSV", async () => {
    const result = await importPersonsCsv(null, importFormData("name,email,position"));
    expect(result.error).toBe("CSV file is empty or contains only headers");
  });

  // Returns error for too many rows
  test("returns error when CSV exceeds max row limit", async () => {
    const rows = Array.from({ length: 1001 }, (_, i) => `Person${i},p${i}@test.com`).join("\n");
    const result = await importPersonsCsv(null, importFormData(`name,email\n${rows}`));
    expect(result.error).toBe("Maximum 1000 rows per import");
  });

  // Skips duplicate emails that already exist in the database
  test("skips persons whose email already exists in DB", async () => {
    await testPrisma.person.create({
      data: { name: "Existing", email: "alice@test.com" },
    });

    const csv = "name,email\nAlice,alice@test.com\nBob,bob@test.com";
    const result = await importPersonsCsv(null, importFormData(csv));

    expect(result.result!.imported).toBe(1);
    expect(result.result!.skipped).toBe(1);
  });

  // Reports validation errors for invalid rows
  test("returns errors for invalid rows", async () => {
    const csv = "name,email\n,not-an-email\nBob,bob@test.com";
    const result = await importPersonsCsv(null, importFormData(csv));

    expect(result.result!.imported).toBe(1);
    expect(result.result!.errors.length).toBeGreaterThan(0);
  });

  // Returns result with 0 imported when all rows are invalid
  test("returns 0 imported when all rows fail validation", async () => {
    const csv = "name,email\n,bad\n,also-bad";
    const result = await importPersonsCsv(null, importFormData(csv));

    expect(result.result!.imported).toBe(0);
    expect(result.result!.errors.length).toBeGreaterThan(0);
  });

  // Imports persons without position column
  test("imports persons without position column", async () => {
    const csv = "name,email\nAlice,alice@test.com";
    const result = await importPersonsCsv(null, importFormData(csv));

    expect(result.result!.imported).toBe(1);
    const person = await testPrisma.person.findFirst({ where: { email: "alice@test.com" } });
    expect(person!.position).toBeNull();
  });

  // Returns error for empty file
  test("returns error for empty file", async () => {
    const fd = new FormData();
    fd.append("file", new File([""], "empty.csv", { type: "text/csv" }));
    const result = await importPersonsCsv(null, fd);
    expect(result.error).toBe("Please select a CSV file");
  });
});

describe("exportPersonsCsv", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Exports persons as CSV with headers and data
  test("exports persons as CSV", async () => {
    await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com", position: "Manager" },
    });

    const csv = await exportPersonsCsv();
    expect(csv).toContain("name,email,position,createdAt");
    expect(csv).toContain("Alice,alice@test.com,Manager");
  });

  // Exports empty CSV (headers only) when no persons exist
  test("exports headers only when no persons exist", async () => {
    const csv = await exportPersonsCsv();
    expect(csv).toContain("name,email,position,createdAt");
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(1);
  });

  // Does not include soft-deleted persons
  test("excludes soft-deleted persons", async () => {
    await testPrisma.person.create({
      data: { name: "Active", email: "active@test.com" },
    });
    await testPrisma.person.create({
      data: { name: "Deleted", email: "deleted@test.com", deletedAt: new Date() },
    });

    const csv = await exportPersonsCsv();
    expect(csv).toContain("Active");
    expect(csv).not.toContain("Deleted");
  });

  // Sorts persons by name
  test("sorts persons by name ascending", async () => {
    await testPrisma.person.create({
      data: { name: "Charlie", email: "charlie@test.com" },
    });
    await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });

    const csv = await exportPersonsCsv();
    const aliceIdx = csv.indexOf("Alice");
    const charlieIdx = csv.indexOf("Charlie");
    expect(aliceIdx).toBeLessThan(charlieIdx);
  });
});

describe("exportTeamsCsv", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Exports teams with headers
  test("exports teams as CSV with headers", async () => {
    await testPrisma.team.create({ data: { teamName: "Engineering" } });

    const csv = await exportTeamsCsv();
    expect(csv).toContain("name,manager,department,memberCount,members,createdAt");
    expect(csv).toContain("Engineering");
  });

  // Exports headers only when no teams exist
  test("exports headers only when no teams exist", async () => {
    const csv = await exportTeamsCsv();
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("name,manager");
  });

  // Includes manager name in export
  test("includes manager name", async () => {
    const manager = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await testPrisma.team.create({
      data: { teamName: "Engineering", manager: { connect: { id: manager.id } } },
    });

    const csv = await exportTeamsCsv();
    expect(csv).toContain("Alice");
  });

  // Includes member names in export
  test("includes member names", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Bob", email: "bob@test.com" },
    });
    const team = await testPrisma.team.create({ data: { teamName: "Design" } });
    await testPrisma.teamMember.create({
      data: {
        person: { connect: { id: person.id } },
        team: { connect: { teamId: team.teamId } },
      },
    });

    const csv = await exportTeamsCsv();
    expect(csv).toContain("Bob");
    expect(csv).toContain("1"); // memberCount
  });

  // Excludes soft-deleted teams
  test("excludes soft-deleted teams", async () => {
    await testPrisma.team.create({ data: { teamName: "Active" } });
    await testPrisma.team.create({ data: { teamName: "Deleted", deletedAt: new Date() } });

    const csv = await exportTeamsCsv();
    expect(csv).toContain("Active");
    expect(csv).not.toContain("Deleted");
  });
});

describe("exportDepartmentsCsv", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Exports departments with headers
  test("exports departments as CSV with headers", async () => {
    await testPrisma.department.create({ data: { name: "Engineering" } });

    const csv = await exportDepartmentsCsv();
    expect(csv).toContain("name,description,head,teamCount,teams,createdAt");
    expect(csv).toContain("Engineering");
  });

  // Exports headers only when no departments exist
  test("exports headers only when no departments exist", async () => {
    const csv = await exportDepartmentsCsv();
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(1);
  });

  // Includes head name in export
  test("includes department head name", async () => {
    const head = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await testPrisma.department.create({
      data: { name: "Engineering", head: { connect: { id: head.id } } },
    });

    const csv = await exportDepartmentsCsv();
    expect(csv).toContain("Alice");
  });

  // Includes team count
  test("includes team count for departments", async () => {
    const dept = await testPrisma.department.create({ data: { name: "Engineering" } });
    await testPrisma.team.create({
      data: { teamName: "TeamA", department: { connect: { id: dept.id } } },
    });
    await testPrisma.team.create({
      data: { teamName: "TeamB", department: { connect: { id: dept.id } } },
    });

    const csv = await exportDepartmentsCsv();
    expect(csv).toContain("2"); // teamCount
  });

  // Excludes soft-deleted departments
  test("excludes soft-deleted departments", async () => {
    await testPrisma.department.create({ data: { name: "Active" } });
    await testPrisma.department.create({ data: { name: "Deleted", deletedAt: new Date() } });

    const csv = await exportDepartmentsCsv();
    expect(csv).toContain("Active");
    expect(csv).not.toContain("Deleted");
  });
});

describe("exportAuditLogsCsv", () => {
  beforeAll(async () => {
    await setupTestMongo();
    (globalThis as Record<string, unknown>).__testAuditLogCollection = getTestAuditLogCollection();
  });

  beforeEach(async () => {
    await cleanDb();
    await cleanTestMongo();
  });

  afterAll(async () => {
    await cleanDb();
    await teardownTestMongo();
    await testPrisma.$disconnect();
  });

  /** Helper to insert a test audit log into MongoDB. */
  async function insertAuditLog(
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

  // Exports audit logs with headers
  test("exports audit logs as CSV with headers", async () => {
    await insertAuditLog({
      action: "create",
      entityType: "person",
      entityId: "abc-123",
      userEmail: "alice@test.com",
      after: '{"name":"Alice"}',
    });

    const csv = await exportAuditLogsCsv();
    expect(csv).toContain("timestamp,userEmail,action,entityType,entityId,before,after");
    expect(csv).toContain("alice@test.com");
    expect(csv).toContain("create");
    expect(csv).toContain("person");
  });

  // Exports headers only when no logs exist
  test("exports headers only when no audit logs exist", async () => {
    const csv = await exportAuditLogsCsv();
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(1);
  });

  // Exports multiple logs ordered by timestamp descending
  test("exports logs in descending order", async () => {
    await insertAuditLog({
      action: "create",
      entityType: "person",
      userEmail: "first@test.com",
      createdAt: new Date("2026-01-01"),
    });
    await insertAuditLog({
      action: "delete",
      entityType: "team",
      userEmail: "second@test.com",
      createdAt: new Date("2026-02-01"),
    });

    const csv = await exportAuditLogsCsv();
    const secondIdx = csv.indexOf("second@test.com");
    const firstIdx = csv.indexOf("first@test.com");
    // Second log (newer) should appear before first log (older)
    expect(secondIdx).toBeLessThan(firstIdx);
  });
});
