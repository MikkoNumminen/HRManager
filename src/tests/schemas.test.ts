import { PersonSchema, TeamMemberSchema, TeamSchema } from "@/schemas";

const VALID_UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const VALID_UUID_2 = "c2ddfe11-be2d-4af9-8c7e-8ddadf592c33";
const NOW = new Date();

describe("PersonSchema", () => {
  const validPerson = {
    id: VALID_UUID,
    name: "John Doe",
    position: "Developer",
    email: "john@example.com",
    createdAt: NOW,
    updatedAt: NOW,
  };

  test("accepts a fully valid person", () => {
    expect(() => PersonSchema.parse(validPerson)).not.toThrow();
  });

  test("accepts null position and email", () => {
    const person = { ...validPerson, position: null, email: null };
    const result = PersonSchema.parse(person);
    expect(result.position).toBeNull();
    expect(result.email).toBeNull();
  });

  test("rejects missing name", () => {
    const person = { ...validPerson, name: undefined };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  test("rejects empty name", () => {
    const person = { ...validPerson, name: "" };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  test("rejects invalid UUID for id", () => {
    const person = { ...validPerson, id: "not-a-uuid" };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  test("rejects missing id", () => {
    const { id: _, ...person } = validPerson;
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  test("rejects non-date createdAt", () => {
    const person = { ...validPerson, createdAt: "not-a-date" };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  test("rejects non-date updatedAt", () => {
    const person = { ...validPerson, updatedAt: 12345 };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  test("rejects numeric name", () => {
    const person = { ...validPerson, name: 123 };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  test("rejects numeric position (non-string, non-null)", () => {
    const person = { ...validPerson, position: 42 };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  test("preserves all fields after parsing", () => {
    const result = PersonSchema.parse(validPerson);
    expect(result).toEqual(validPerson);
  });
});

describe("TeamMemberSchema", () => {
  const validMember = {
    personId: VALID_UUID,
    name: "Jane Smith",
    email: "jane@example.com",
  };

  test("accepts a valid team member", () => {
    expect(() => TeamMemberSchema.parse(validMember)).not.toThrow();
  });

  test("accepts null email", () => {
    const member = { ...validMember, email: null };
    const result = TeamMemberSchema.parse(member);
    expect(result.email).toBeNull();
  });

  test("rejects invalid UUID for personId", () => {
    const member = { ...validMember, personId: "bad" };
    expect(() => TeamMemberSchema.parse(member)).toThrow();
  });

  test("rejects missing name", () => {
    const { name: _, ...member } = validMember;
    expect(() => TeamMemberSchema.parse(member)).toThrow();
  });

  test("rejects missing personId", () => {
    const { personId: _, ...member } = validMember;
    expect(() => TeamMemberSchema.parse(member)).toThrow();
  });
});

describe("TeamSchema", () => {
  const validTeam = {
    teamId: VALID_UUID,
    teamName: "Engineering",
    teamManagerId: VALID_UUID_2,
    managerName: "Alice",
    createdAt: NOW,
    updatedAt: NOW,
    members: [
      { personId: VALID_UUID, name: "Bob", email: "bob@example.com" },
      { personId: VALID_UUID_2, name: "Carol", email: null },
    ],
  };

  test("accepts a fully valid team", () => {
    expect(() => TeamSchema.parse(validTeam)).not.toThrow();
  });

  test("accepts null teamManagerId and managerName", () => {
    const team = { ...validTeam, teamManagerId: null, managerName: null };
    const result = TeamSchema.parse(team);
    expect(result.teamManagerId).toBeNull();
    expect(result.managerName).toBeNull();
  });

  test("accepts empty members array", () => {
    const team = { ...validTeam, members: [] };
    const result = TeamSchema.parse(team);
    expect(result.members).toEqual([]);
  });

  test("rejects empty teamName", () => {
    const team = { ...validTeam, teamName: "" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  test("rejects invalid UUID for teamId", () => {
    const team = { ...validTeam, teamId: "nope" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  test("rejects invalid UUID for teamManagerId (non-null)", () => {
    const team = { ...validTeam, teamManagerId: "not-uuid" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  test("rejects missing members array", () => {
    const { members: _, ...team } = validTeam;
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  test("rejects invalid member inside members array", () => {
    const team = { ...validTeam, members: [{ personId: "bad", name: "X", email: null }] };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  test("preserves all fields after parsing", () => {
    const result = TeamSchema.parse(validTeam);
    expect(result).toEqual(validTeam);
  });

  test("rejects missing teamName", () => {
    const { teamName: _, ...team } = validTeam;
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  test("rejects non-date createdAt", () => {
    const team = { ...validTeam, createdAt: "yesterday" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });
});
