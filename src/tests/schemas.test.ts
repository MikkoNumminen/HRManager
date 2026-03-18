import {
  PersonSchema,
  TeamMemberSchema,
  TeamSchema,
  UserSchema,
  PermissionsSchema,
} from "@/schemas";

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

  // Give it all the right info and it should be happy — no complaints.
  test("accepts a fully valid person", () => {
    expect(() => PersonSchema.parse(validPerson)).not.toThrow();
  });

  // Position and email are optional in the database, so null is totally fine.
  test("accepts null position and email", () => {
    const person = { ...validPerson, position: null, email: null };
    const result = PersonSchema.parse(person);
    expect(result.position).toBeNull();
    expect(result.email).toBeNull();
  });

  // Every person needs a name. No name? No entry.
  test("rejects missing name", () => {
    const person = { ...validPerson, name: undefined };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // An empty string is not a name — you have to actually type something.
  test("rejects empty name", () => {
    const person = { ...validPerson, name: "" };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // The ID has to look like a real UUID, not just any random text.
  test("rejects invalid UUID for id", () => {
    const person = { ...validPerson, id: "not-a-uuid" };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // You can't skip the ID entirely — every person needs one to be identified.
  test("rejects missing id", () => {
    const { id: _, ...person } = validPerson;
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // createdAt has to be an actual Date object, not a string like "yesterday".
  test("rejects non-date createdAt", () => {
    const person = { ...validPerson, createdAt: "not-a-date" };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // Same for updatedAt — a number isn't a date either.
  test("rejects non-date updatedAt", () => {
    const person = { ...validPerson, updatedAt: 12345 };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // Names are text, not numbers. 123 is not a valid name.
  test("rejects numeric name", () => {
    const person = { ...validPerson, name: 123 };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // Position can be null or a string, but a number sneaking in is not allowed.
  test("rejects numeric position (non-string, non-null)", () => {
    const person = { ...validPerson, position: 42 };
    expect(() => PersonSchema.parse(person)).toThrow();
  });

  // What goes in should come back out exactly the same — no data lost or changed.
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

  // A member with all valid fields should pass without issues.
  test("accepts a valid team member", () => {
    expect(() => TeamMemberSchema.parse(validMember)).not.toThrow();
  });

  // Not everyone has an email on file — null is an acceptable value here.
  test("accepts null email", () => {
    const member = { ...validMember, email: null };
    const result = TeamMemberSchema.parse(member);
    expect(result.email).toBeNull();
  });

  // The personId links to a real person, so it has to be a proper UUID.
  test("rejects invalid UUID for personId", () => {
    const member = { ...validMember, personId: "bad" };
    expect(() => TeamMemberSchema.parse(member)).toThrow();
  });

  // A team member without a name is meaningless — we need to know who they are.
  test("rejects missing name", () => {
    const { name: _, ...member } = validMember;
    expect(() => TeamMemberSchema.parse(member)).toThrow();
  });

  // Without a personId, we can't link this member to anyone in the database.
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

  // A complete team with manager and members — everything checks out.
  test("accepts a fully valid team", () => {
    expect(() => TeamSchema.parse(validTeam)).not.toThrow();
  });

  // A team doesn't need a manager right away — null is fine until one is assigned.
  test("accepts null teamManagerId and managerName", () => {
    const team = { ...validTeam, teamManagerId: null, managerName: null };
    const result = TeamSchema.parse(team);
    expect(result.teamManagerId).toBeNull();
    expect(result.managerName).toBeNull();
  });

  // A brand new team might not have anyone in it yet — empty list is valid.
  test("accepts empty members array", () => {
    const team = { ...validTeam, members: [] };
    const result = TeamSchema.parse(team);
    expect(result.members).toEqual([]);
  });

  // Every team needs a name so you can tell them apart.
  test("rejects empty teamName", () => {
    const team = { ...validTeam, teamName: "" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // The team's ID has to be a real UUID — no made-up strings.
  test("rejects invalid UUID for teamId", () => {
    const team = { ...validTeam, teamId: "nope" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // If there IS a manager ID, it has to be a valid UUID — can't just put anything there.
  test("rejects invalid UUID for teamManagerId (non-null)", () => {
    const team = { ...validTeam, teamManagerId: "not-uuid" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // The members field is required — even if it's empty, it has to be there as an array.
  test("rejects missing members array", () => {
    const { members: _, ...team } = validTeam;
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // If one member in the list has bad data, the whole team validation fails.
  test("rejects invalid member inside members array", () => {
    const team = { ...validTeam, members: [{ personId: "bad", name: "X", email: null }] };
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // Just like with persons — what goes in should come back out identical.
  test("preserves all fields after parsing", () => {
    const result = TeamSchema.parse(validTeam);
    expect(result).toEqual(validTeam);
  });

  // You can't skip the team name field entirely — it's required.
  test("rejects missing teamName", () => {
    const { teamName: _, ...team } = validTeam;
    expect(() => TeamSchema.parse(team)).toThrow();
  });

  // Timestamps need to be real Date objects, not casual strings.
  test("rejects non-date createdAt", () => {
    const team = { ...validTeam, createdAt: "yesterday" };
    expect(() => TeamSchema.parse(team)).toThrow();
  });
});

describe("UserSchema", () => {
  const validUser = {
    id: VALID_UUID,
    email: "alice@example.com",
    name: "Alice",
    image: "https://example.com/avatar.png",
    role: "administrator" as const,
    createdAt: NOW,
    updatedAt: NOW,
  };

  // A complete user with all fields should parse without any issues.
  test("accepts a fully valid user", () => {
    expect(() => UserSchema.parse(validUser)).not.toThrow();
  });

  // Name and image are optional in OAuth — some providers don't give them.
  test("accepts null name and image", () => {
    const user = { ...validUser, name: null, image: null };
    const result = UserSchema.parse(user);
    expect(result.name).toBeNull();
    expect(result.image).toBeNull();
  });

  // All four roles should be accepted — superuser, administrator, user, guest.
  test("accepts all four valid roles", () => {
    for (const role of ["superuser", "administrator", "user", "guest"]) {
      expect(() => UserSchema.parse({ ...validUser, role })).not.toThrow();
    }
  });

  // A made-up role like "moderator" should be rejected — only the four defined roles are valid.
  test("rejects invalid role", () => {
    const user = { ...validUser, role: "moderator" };
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // The email must be a proper email format — "not-an-email" won't fly.
  test("rejects invalid email format", () => {
    const user = { ...validUser, email: "not-an-email" };
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // Every user needs an email — it's how we identify them from OAuth.
  test("rejects missing email", () => {
    const { email: _, ...user } = validUser;
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // The ID has to be a proper UUID, not some random text.
  test("rejects invalid UUID for id", () => {
    const user = { ...validUser, id: "bad-id" };
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // Every user needs an ID — can't skip it.
  test("rejects missing id", () => {
    const { id: _, ...user } = validUser;
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // Timestamps must be real Date objects, not strings or numbers.
  test("rejects non-date createdAt", () => {
    const user = { ...validUser, createdAt: "yesterday" };
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // Same for updatedAt — must be a Date.
  test("rejects non-date updatedAt", () => {
    const user = { ...validUser, updatedAt: 12345 };
    expect(() => UserSchema.parse(user)).toThrow();
  });

  // What goes in should come back out exactly the same.
  test("preserves all fields after parsing", () => {
    const result = UserSchema.parse(validUser);
    expect(result).toEqual(validUser);
  });
});

describe("PermissionsSchema", () => {
  // A map of permission keys to booleans should parse fine.
  test("accepts a valid permissions record", () => {
    const perms = { "person:create": true, "person:delete": false, "team:read": true };
    expect(() => PermissionsSchema.parse(perms)).not.toThrow();
  });

  // An empty permissions object is valid — it just means no permissions listed.
  test("accepts an empty object", () => {
    const result = PermissionsSchema.parse({});
    expect(result).toEqual({});
  });

  // Permission values must be booleans — strings like "yes" are not allowed.
  test("rejects non-boolean values", () => {
    const perms = { "person:create": "yes" };
    expect(() => PermissionsSchema.parse(perms)).toThrow();
  });

  // Permission values must be booleans — numbers are not allowed either.
  test("rejects numeric values", () => {
    const perms = { "person:create": 1 };
    expect(() => PermissionsSchema.parse(perms)).toThrow();
  });

  // What goes in should come back out exactly the same.
  test("preserves all entries after parsing", () => {
    const perms = { "data:reset": true, "data:seed": false };
    const result = PermissionsSchema.parse(perms);
    expect(result).toEqual(perms);
  });
});
