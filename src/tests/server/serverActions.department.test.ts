import {
  testPrisma,
  cleanDb,
  createTestPerson,
  createTestTeam,
  createTestDepartment,
} from "./testDb";

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
  createDepartment,
  removeDepartment,
  updateDepartment,
  updateDepartmentHead,
  assignTeamToDepartment,
  removeTeamFromDepartment,
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
    expect(await createDepartment(formData({ name: "" }))).toMatchObject({
      error: expect.stringContaining("Invalid Name"),
    });
  });

  // Throws when name is missing.
  test("throws on missing name", async () => {
    expect(await createDepartment(formData({}))).toMatchObject({
      error: expect.stringContaining("Invalid Name"),
    });
  });

  // Department names have a length limit.
  test("throws when name exceeds max length", async () => {
    const longName = "A".repeat(256);
    expect(await createDepartment(formData({ name: longName }))).toMatchObject({
      error: expect.stringContaining("characters or less"),
    });
  });

  // Department descriptions have a length limit.
  test("throws when description exceeds max length", async () => {
    const longDesc = "A".repeat(1001);
    expect(await createDepartment(formData({ name: "Eng", description: longDesc }))).toMatchObject({
      error: expect.stringContaining("characters or less"),
    });
  });
});

describe("removeDepartment", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Removes a department and unlinks its teams.
  test("removes department and unlinks teams", async () => {
    const dept = await createTestDepartment({ name: "Eng" });
    await createTestTeam({ teamName: "Platform", departmentId: dept.id });

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
    expect(await removeDepartment(formData({}))).toMatchObject({
      error: expect.stringContaining("No departmentID selected"),
    });
  });

  // Throws on invalid UUID.
  test("throws on invalid UUID", async () => {
    expect(await removeDepartment(formData({ departmentID: "bad" }))).toMatchObject({
      error: expect.stringContaining("Invalid departmentID format"),
    });
  });
});

describe("updateDepartment", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Updates department name and description.
  test("updates department name and description", async () => {
    const dept = await createTestDepartment({ name: "Eng", description: "Old" });
    await updateDepartment(
      formData({ departmentID: dept.id, name: "Engineering", description: "New desc" }),
    );
    const updated = await testPrisma.department.findUnique({ where: { id: dept.id } });
    expect(updated!.name).toBe("Engineering");
    expect(updated!.description).toBe("New desc");
  });

  // Throws when name is empty.
  test("throws on empty name", async () => {
    const dept = await createTestDepartment({ name: "Eng" });
    expect(await updateDepartment(formData({ departmentID: dept.id, name: "" }))).toMatchObject({
      error: expect.stringContaining("Department name is required"),
    });
  });

  // Throws when departmentID is missing.
  test("throws on missing departmentID", async () => {
    expect(await updateDepartment(formData({ name: "X" }))).toMatchObject({
      error: expect.stringContaining("No departmentID provided"),
    });
  });

  // Department names have a length limit.
  test("throws when name exceeds max length", async () => {
    const dept = await createTestDepartment({ name: "Eng" });
    const longName = "A".repeat(256);
    expect(
      await updateDepartment(formData({ departmentID: dept.id, name: longName })),
    ).toMatchObject({ error: expect.stringContaining("characters or less") });
  });

  // Department descriptions have a length limit.
  test("throws when description exceeds max length", async () => {
    const dept = await createTestDepartment({ name: "Eng" });
    const longDesc = "A".repeat(1001);
    expect(
      await updateDepartment(
        formData({ departmentID: dept.id, name: "Eng", description: longDesc }),
      ),
    ).toMatchObject({ error: expect.stringContaining("characters or less") });
  });

  // Can't update a department that doesn't exist.
  test("throws when department does not exist", async () => {
    expect(
      await updateDepartment(
        formData({ departmentID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", name: "New" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Department not found") });
  });
});

describe("updateDepartmentHead", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Sets the department head to a person.
  test("sets department head", async () => {
    const dept = await createTestDepartment({ name: "Eng" });
    const person = await createTestPerson({ name: "Alice" });

    await updateDepartmentHead(formData({ departmentID: dept.id, personID: person.id }));

    const updated = await testPrisma.department.findUnique({ where: { id: dept.id } });
    expect(updated!.headId).toBe(person.id);
  });

  // Clears the department head when personID is empty.
  test("clears department head when personID is empty", async () => {
    const person = await createTestPerson({ name: "Alice" });
    const dept = await createTestDepartment({ name: "Eng", headId: person.id });

    await updateDepartmentHead(formData({ departmentID: dept.id, personID: "" }));

    const updated = await testPrisma.department.findUnique({ where: { id: dept.id } });
    expect(updated!.headId).toBeNull();
  });

  // Throws when departmentID is missing.
  test("throws on missing departmentID", async () => {
    expect(await updateDepartmentHead(formData({}))).toMatchObject({
      error: expect.stringContaining("No departmentID provided"),
    });
  });

  // Can't set a non-existent person as department head.
  test("throws when person does not exist", async () => {
    const dept = await createTestDepartment({ name: "Eng" });
    expect(
      await updateDepartmentHead(
        formData({
          departmentID: dept.id,
          personID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Person not found") });
  });

  // Can't update head of a department that doesn't exist.
  test("throws when department does not exist", async () => {
    const person = await createTestPerson({ name: "Alice" });
    expect(
      await updateDepartmentHead(
        formData({
          departmentID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          personID: person.id,
        }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Department not found") });
  });
});

describe("assignTeamToDepartment", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Assigns a team to a department.
  test("assigns a team to a department", async () => {
    const dept = await createTestDepartment({ name: "Eng" });
    const team = await createTestTeam({ teamName: "Platform" });

    await assignTeamToDepartment(formData({ departmentID: dept.id, teamID: team.teamId }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.departmentId).toBe(dept.id);
  });

  // Throws when departmentID is missing.
  test("throws on missing departmentID", async () => {
    expect(
      await assignTeamToDepartment(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).toMatchObject({ error: expect.stringContaining("No departmentID provided") });
  });

  // Throws when teamID is missing.
  test("throws on missing teamID", async () => {
    expect(
      await assignTeamToDepartment(
        formData({ departmentID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      ),
    ).toMatchObject({ error: expect.stringContaining("No teamID provided") });
  });

  // Can't assign a team to a department that doesn't exist.
  test("throws when department does not exist", async () => {
    const team = await createTestTeam({ teamName: "Platform" });
    expect(
      await assignTeamToDepartment(
        formData({
          departmentID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          teamID: team.teamId,
        }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Department not found") });
  });

  // Can't assign a non-existent team to a department.
  test("throws when team does not exist", async () => {
    const dept = await createTestDepartment({ name: "Eng" });
    expect(
      await assignTeamToDepartment(
        formData({
          departmentID: dept.id,
          teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        }),
      ),
    ).toMatchObject({ error: expect.stringContaining("Team not found") });
  });
});

describe("removeTeamFromDepartment", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
  });

  // Removes a team from its department.
  test("removes a team from its department", async () => {
    const dept = await createTestDepartment({ name: "Eng" });
    const team = await createTestTeam({ teamName: "Platform", departmentId: dept.id });

    await removeTeamFromDepartment(formData({ teamID: team.teamId }));

    const updated = await testPrisma.team.findUnique({ where: { teamId: team.teamId } });
    expect(updated!.departmentId).toBeNull();
  });

  // Throws when teamID is missing.
  test("throws on missing teamID", async () => {
    expect(await removeTeamFromDepartment(formData({}))).toMatchObject({
      error: expect.stringContaining("No teamID provided"),
    });
  });

  // Can't remove a team that doesn't exist from a department.
  test("throws when team does not exist", async () => {
    expect(
      await removeTeamFromDepartment(formData({ teamID: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })),
    ).toMatchObject({ error: expect.stringContaining("Team not found") });
  });
});

afterAll(() => testPrisma.$disconnect());
