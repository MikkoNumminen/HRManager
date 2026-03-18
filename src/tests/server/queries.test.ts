import { testPrisma, cleanDb } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

import { getPersons, getTeams } from "@/queries";

describe("getPersons", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  test("returns empty array when no persons exist", async () => {
    const result = await getPersons();
    expect(result).toEqual([]);
  });

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

  test("returns empty array when no teams exist", async () => {
    const result = await getTeams();
    expect(result).toEqual([]);
  });

  test("returns team with null manager when no manager assigned", async () => {
    await testPrisma.team.create({
      data: { teamName: "No Manager Team" },
    });

    const [team] = await getTeams();
    expect(team.teamName).toBe("No Manager Team");
    expect(team.teamManagerId).toBeNull();
    expect(team.managerName).toBeNull();
  });

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

  test("returns team with empty members array when no members", async () => {
    await testPrisma.team.create({
      data: { teamName: "Empty Team" },
    });

    const [team] = await getTeams();
    expect(team.members).toEqual([]);
  });

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
