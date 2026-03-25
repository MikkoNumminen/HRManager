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
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import {
  createPerson,
  removePerson,
  updatePosition,
  updateEmail,
  updatePersonName,
} from "@/features/persons/actions";

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
  afterAll(() => cleanDb());

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
    expect(await createPerson(formData({ name: "", email: "x@test.com" }))).toMatchObject({
      error: expect.stringContaining("Invalid Name"),
    });
  });

  // Spaces don't count as a name either. Nice try though.
  test("throws on whitespace-only name", async () => {
    expect(await createPerson(formData({ name: "   ", email: "x@test.com" }))).toMatchObject({
      error: expect.stringContaining("Invalid Name"),
    });
  });

  // Email is required — we use it as a unique identifier and for contact info.
  test("throws on missing email", async () => {
    expect(await createPerson(formData({ name: "Alice" }))).toMatchObject({
      error: expect.stringContaining("Email is required"),
    });
  });

  // An empty string is not an email address.
  test("throws on empty email", async () => {
    expect(await createPerson(formData({ name: "Alice", email: "" }))).toMatchObject({
      error: expect.stringContaining("Email is required"),
    });
  });

  // "not-an-email" doesn't have an @ sign — the regex catches this.
  test("throws on invalid email format", async () => {
    expect(await createPerson(formData({ name: "Alice", email: "not-an-email" }))).toMatchObject({
      error: expect.stringContaining("Invalid email format"),
    });
  });

  // Two people can't share the same email — the database enforces uniqueness,
  // but we check first to give a friendly error message.
  test("throws on duplicate email", async () => {
    await createPerson(formData({ name: "Alice", email: "dup@test.com" }));
    expect(await createPerson(formData({ name: "Bob", email: "dup@test.com" }))).toMatchObject({
      error: expect.stringContaining("A person with this email already exists"),
    });
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
    expect(await createPerson(formData({ name: longName, email: "long@test.com" }))).toMatchObject({
      error: expect.stringContaining("characters or less"),
    });
  });

  // Email addresses longer than 320 characters are rejected.
  test("throws when email exceeds max length", async () => {
    const longEmail = "a".repeat(315) + "@test.com";
    expect(await createPerson(formData({ name: "Alice", email: longEmail }))).toMatchObject({
      error: expect.stringContaining("characters or less"),
    });
  });
});

describe("removePerson", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Delete a person and verify they're actually gone from the database.
  test("removes a person by ID", async () => {
    const person = await createTestPerson({ name: "ToRemove", email: "remove@test.com" });

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
    const person = await createTestPerson({ name: "Member", email: "member@test.com" });
    const team = await createTestTeam({ teamName: "Team A" });
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
    const p1 = await createTestPerson({ name: "One", email: "one@test.com" });
    const p2 = await createTestPerson({ name: "Two", email: "two@test.com" });

    await removePerson(formData({ personID: [p1.id, p2.id] }));
    const remaining = await testPrisma.person.findMany({ where: { deletedAt: null } });
    expect(remaining).toHaveLength(0);
  });

  // If the form is submitted without selecting anyone, we should get a clear error.
  test("throws when no personID provided", async () => {
    expect(await removePerson(formData({}))).toMatchObject({
      error: expect.stringContaining("No personID selected"),
    });
  });

  // IDs have to be valid UUIDs — this stops someone from injecting garbage into the query.
  test("throws on invalid UUID", async () => {
    expect(await removePerson(formData({ personID: "bad-id" }))).toMatchObject({
      error: expect.stringContaining("Invalid personID format"),
    });
  });
});

describe("updatePersonName", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Change someone's name and verify the database actually saved it.
  test("updates a person's name", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });

    await updatePersonName(formData({ personID: person.id, name: "Alicia" }));

    const updated = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(updated!.name).toBe("Alicia");
  });

  // We need to know WHOSE name to update — can't do it without an ID.
  test("throws when no personID provided", async () => {
    expect(await updatePersonName(formData({ name: "Bob" }))).toMatchObject({
      error: expect.stringContaining("No personID provided"),
    });
  });

  // The ID has to be a proper UUID, not some random string.
  test("throws on invalid UUID", async () => {
    expect(await updatePersonName(formData({ personID: "bad", name: "Bob" }))).toMatchObject({
      error: expect.stringContaining("Invalid personID format"),
    });
  });

  // You can't set someone's name to nothing — names are required.
  test("throws when name is empty", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    expect(await updatePersonName(formData({ personID: person.id, name: "" }))).toMatchObject({
      error: expect.stringContaining("New name is missing"),
    });
  });

  // Attempting to update a non-existent person throws a clear error.
  test("throws when person does not exist", async () => {
    expect(
      await updatePersonName(
        formData({ personID: "00000000-0000-0000-0000-000000000000", name: "Bob" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Person not found") });
  });

  // Names longer than 255 characters are rejected.
  test("throws when name exceeds max length", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const longName = "A".repeat(256);
    expect(await updatePersonName(formData({ personID: person.id, name: longName }))).toMatchObject(
      { error: expect.stringContaining("characters or less") },
    );
  });
});

describe("updatePosition", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Change someone's job title and verify the database actually saved it.
  test("updates a person's position", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });

    await updatePosition(formData({ personID: person.id, name: "Senior Dev" }));

    const updated = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(updated!.position).toBe("Senior Dev");
  });

  // We need to know WHOSE position to update — can't do it without an ID.
  test("throws when no personID provided", async () => {
    expect(await updatePosition(formData({ name: "Dev" }))).toMatchObject({
      error: expect.stringContaining("No personID provided"),
    });
  });

  // The ID has to be a proper UUID, not some random string.
  test("throws on invalid UUID", async () => {
    expect(await updatePosition(formData({ personID: "bad", name: "Dev" }))).toMatchObject({
      error: expect.stringContaining("Invalid personID format"),
    });
  });

  // You can't set someone's position to nothing — that's what null is for,
  // and there's no UI flow for deliberately blanking out a position.
  test("throws when position is empty", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    expect(await updatePosition(formData({ personID: person.id, name: "" }))).toMatchObject({
      error: expect.stringContaining("New position is missing"),
    });
  });

  // Attempting to update a non-existent person throws a clear error.
  test("throws when person does not exist", async () => {
    expect(
      await updatePosition(
        formData({ personID: "00000000-0000-0000-0000-000000000000", name: "Dev" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Person not found") });
  });

  // Position strings longer than 255 characters are rejected.
  test("throws when position exceeds max length", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const longPosition = "A".repeat(256);
    expect(
      await updatePosition(formData({ personID: person.id, name: longPosition })),
    ).toMatchObject({ error: expect.stringContaining("characters or less") });
  });

  // Accepts "position" as the form data key (alternative to "name").
  test("reads position from 'position' form data key", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });

    await updatePosition(formData({ personID: person.id, position: "Lead Dev" }));

    const updated = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(updated!.position).toBe("Lead Dev");
  });

  // When the position already exists in the catalog, it should not be re-created.
  test("does not create a duplicate position in the catalog when it already exists", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    // Pre-create the position in the catalog
    await testPrisma.position.create({ data: { name: "Staff Eng", sessionId: null } });

    await updatePosition(formData({ personID: person.id, name: "Staff Eng" }));

    // Only one position entry should exist in the catalog
    const positions = await testPrisma.position.findMany({ where: { name: "Staff Eng" } });
    expect(positions).toHaveLength(1);
    const updated = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(updated!.position).toBe("Staff Eng");
  });
});

describe("updateEmail", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Change someone's email and make sure the new one is saved.
  test("updates a person's email", async () => {
    const person = await createTestPerson({ name: "Alice", email: "old@test.com" });

    await updateEmail(formData({ personID: person.id, name: "new@test.com" }));

    const updated = await testPrisma.person.findUnique({ where: { id: person.id } });
    expect(updated!.email).toBe("new@test.com");
  });

  // Can't change your email to one that someone else already has.
  // Email is unique across the whole system.
  test("throws on duplicate email", async () => {
    const p1 = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    await createTestPerson({ name: "Bob", email: "taken@test.com" });

    expect(await updateEmail(formData({ personID: p1.id, name: "taken@test.com" }))).toMatchObject({
      error: expect.stringContaining("A person with this email already exists"),
    });
  });

  // The new email has to actually look like an email address.
  test("throws on invalid email format", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    expect(await updateEmail(formData({ personID: person.id, name: "not-valid" }))).toMatchObject({
      error: expect.stringContaining("Invalid email format"),
    });
  });

  // You can't update to an empty email — if you want to remove it,
  // that would need a different operation entirely.
  test("throws when email is empty", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    expect(await updateEmail(formData({ personID: person.id, name: "" }))).toMatchObject({
      error: expect.stringContaining("New Email is missing"),
    });
  });

  // Need to know whose email to update — can't do it without an ID.
  test("throws when no personID provided", async () => {
    expect(await updateEmail(formData({ name: "a@b.com" }))).toMatchObject({
      error: expect.stringContaining("No personID selected"),
    });
  });

  // Same UUID check as everywhere else — no garbage IDs allowed.
  test("throws on invalid UUID", async () => {
    expect(await updateEmail(formData({ personID: "nope", name: "a@b.com" }))).toMatchObject({
      error: expect.stringContaining("Invalid personID format"),
    });
  });

  // Attempting to update email on a non-existent person throws a clear error.
  test("throws when person does not exist", async () => {
    expect(
      await updateEmail(
        formData({ personID: "00000000-0000-0000-0000-000000000000", name: "new@test.com" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Person not found") });
  });

  // Email addresses longer than 320 characters are rejected.
  test("throws when email exceeds max length", async () => {
    const person = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    const longEmail = "a".repeat(315) + "@test.com";
    expect(await updateEmail(formData({ personID: person.id, name: longEmail }))).toMatchObject({
      error: expect.stringContaining("characters or less"),
    });
  });
});

afterAll(() => testPrisma.$disconnect());
