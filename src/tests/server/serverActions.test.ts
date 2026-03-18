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

// Mock permissions — requirePermission is a no-op so server action tests focus
// on data logic. Permission resolution is tested separately in permissions.test.ts.
jest.mock("@/permissions", () => ({
  requirePermission: jest.fn(),
  seedPermissions: jest.fn(),
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
  resetAll,
  updateUserRole,
  updateUserPermission,
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
    const remaining = await testPrisma.person.findMany();
    expect(remaining).toHaveLength(0);
  });

  // If someone is on a team and gets deleted, their team membership
  // has to be cleaned up first — otherwise the database would have
  // orphan records pointing to a person that no longer exists.
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

    const members = await testPrisma.teamMember.findMany();
    expect(members).toHaveLength(0);
    const persons = await testPrisma.person.findMany();
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
    const remaining = await testPrisma.person.findMany();
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

  // Same UUID check as everywhere else — no garbage IDs allowed.
  test("throws on invalid UUID", async () => {
    await expect(updateEmail(formData({ personID: "nope", name: "a@b.com" }))).rejects.toThrow(
      "Invalid personID format",
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
});

describe("removeTeam", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  // Delete a team and confirm it's gone.
  test("removes a team", async () => {
    const team = await testPrisma.team.create({
      data: { teamName: "To Delete" },
    });

    await removeTeam(formData({ teamID: team.teamId }));
    const teams = await testPrisma.team.findMany();
    expect(teams).toHaveLength(0);
  });

  // When a team is deleted, all its membership records should be automatically
  // cleaned up (cascade delete). But the people themselves should still exist —
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

    const members = await testPrisma.teamMember.findMany();
    expect(members).toHaveLength(0);
    // Person should still exist
    const persons = await testPrisma.person.findMany();
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

    const members = await testPrisma.teamMember.findMany();
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
});
