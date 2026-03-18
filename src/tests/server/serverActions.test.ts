import { testPrisma, cleanDb } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock Next.js server functions
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
} from "@/serverActions";

// Helper to build FormData
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

  test("creates a person with name and email", async () => {
    await createPerson(formData({ name: "Alice", email: "alice@test.com" }));

    const persons = await testPrisma.person.findMany();
    expect(persons).toHaveLength(1);
    expect(persons[0].name).toBe("Alice");
    expect(persons[0].email).toBe("alice@test.com");
  });

  test("trims whitespace from name", async () => {
    await createPerson(formData({ name: "  Bob  ", email: "bob@test.com" }));

    const [person] = await testPrisma.person.findMany();
    expect(person.name).toBe("Bob");
    expect(person.email).toBe("bob@test.com");
  });

  test("throws on empty name", async () => {
    await expect(createPerson(formData({ name: "", email: "x@test.com" }))).rejects.toThrow(
      "Invalid Name",
    );
  });

  test("throws on whitespace-only name", async () => {
    await expect(createPerson(formData({ name: "   ", email: "x@test.com" }))).rejects.toThrow(
      "Invalid Name",
    );
  });

  test("throws on missing email", async () => {
    await expect(createPerson(formData({ name: "Alice" }))).rejects.toThrow("Email is required");
  });

  test("throws on empty email", async () => {
    await expect(createPerson(formData({ name: "Alice", email: "" }))).rejects.toThrow(
      "Email is required",
    );
  });

  test("throws on invalid email format", async () => {
    await expect(createPerson(formData({ name: "Alice", email: "not-an-email" }))).rejects.toThrow(
      "Invalid email format",
    );
  });

  test("throws on duplicate email", async () => {
    await createPerson(formData({ name: "Alice", email: "dup@test.com" }));
    await expect(createPerson(formData({ name: "Bob", email: "dup@test.com" }))).rejects.toThrow(
      "A person with this email already exists",
    );
  });

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

  test("removes a person by ID", async () => {
    const person = await testPrisma.person.create({
      data: { name: "ToRemove", email: "remove@test.com" },
    });

    await removePerson(formData({ personID: person.id }));
    const remaining = await testPrisma.person.findMany();
    expect(remaining).toHaveLength(0);
  });

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

  test("throws when no personID provided", async () => {
    await expect(removePerson(formData({}))).rejects.toThrow("No personID selected");
  });

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

  test("updates a person's position", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });

    await updatePosition(formData({ personID: person.id, name: "Senior Dev" }));

    const updated = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(updated!.position).toBe("Senior Dev");
  });

  test("throws when no personID provided", async () => {
    await expect(updatePosition(formData({ name: "Dev" }))).rejects.toThrow("No personID provided");
  });

  test("throws on invalid UUID", async () => {
    await expect(updatePosition(formData({ personID: "bad", name: "Dev" }))).rejects.toThrow(
      "Invalid personID format",
    );
  });

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

  test("updates a person's email", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "old@test.com" },
    });

    await updateEmail(formData({ personID: person.id, name: "new@test.com" }));

    const updated = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(updated!.email).toBe("new@test.com");
  });

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

  test("throws on invalid email format", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await expect(updateEmail(formData({ personID: person.id, name: "not-valid" }))).rejects.toThrow(
      "Invalid email format",
    );
  });

  test("throws when email is empty", async () => {
    const person = await testPrisma.person.create({
      data: { name: "Alice", email: "alice@test.com" },
    });
    await expect(updateEmail(formData({ personID: person.id, name: "" }))).rejects.toThrow(
      "New Email is missing",
    );
  });

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

  test("creates a team with null manager", async () => {
    await createTeam(formData({ name: "New Team" }));

    const teams = await testPrisma.team.findMany();
    expect(teams).toHaveLength(1);
    expect(teams[0].teamName).toBe("New Team");
    expect(teams[0].teamManagerId).toBeNull();
  });

  test("trims whitespace from team name", async () => {
    await createTeam(formData({ name: "  Trimmed  " }));

    const [team] = await testPrisma.team.findMany();
    expect(team.teamName).toBe("Trimmed");
  });

  test("throws on empty name", async () => {
    await expect(createTeam(formData({ name: "" }))).rejects.toThrow("Invalid Name");
  });

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

  test("removes a team", async () => {
    const team = await testPrisma.team.create({
      data: { teamName: "To Delete" },
    });

    await removeTeam(formData({ teamID: team.teamId }));
    const teams = await testPrisma.team.findMany();
    expect(teams).toHaveLength(0);
  });

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

  test("throws when no teamID provided", async () => {
    await expect(removeTeam(formData({}))).rejects.toThrow("No teamID selected");
  });

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

  test("throws when no teamID provided", async () => {
    await expect(
      addManager(formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No teamID selected");
  });

  test("throws when no personID provided", async () => {
    await expect(
      addManager(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No personID provided");
  });

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

  test("throws when no teamID provided", async () => {
    await expect(
      addMember(formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No teamID selected");
  });

  test("throws when no personID provided", async () => {
    await expect(
      addMember(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No personID selected");
  });

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

  test("throws when no teamID provided", async () => {
    await expect(
      removeMember(formData({ personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).rejects.toThrow("No teamID selected");
  });

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

  test("succeeds on empty database", async () => {
    await expect(resetAll()).resolves.not.toThrow();
  });
});
