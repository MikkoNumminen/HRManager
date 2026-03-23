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

describe("updateProfileName", () => {
  beforeEach(async () => {
    await cleanDb();
  });
  afterAll(() => cleanDb());

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
  afterAll(() => cleanDb());

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
  afterAll(() => cleanDb());

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
    await createTestPerson({ name: "Existing", email: "alice@test.com" });

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
  afterAll(() => cleanDb());

  // Exports persons as CSV with headers and data
  test("exports persons as CSV", async () => {
    await createTestPerson({ name: "Alice", email: "alice@test.com", position: "Manager" });

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
    await createTestPerson({ name: "Active", email: "active@test.com" });
    await testPrisma.person.create({
      data: { name: "Deleted", email: "deleted@test.com", deletedAt: new Date() },
    });

    const csv = await exportPersonsCsv();
    expect(csv).toContain("Active");
    expect(csv).not.toContain("Deleted");
  });

  // Sorts persons by name
  test("sorts persons by name ascending", async () => {
    await createTestPerson({ name: "Charlie", email: "charlie@test.com" });
    await createTestPerson({ name: "Alice", email: "alice@test.com" });

    const csv = await exportPersonsCsv();
    const aliceIdx = csv.indexOf("Alice");
    const charlieIdx = csv.indexOf("Charlie");
    expect(aliceIdx).toBeLessThan(charlieIdx);
  });
});

describe("exportTeamsCsv", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Exports teams with headers
  test("exports teams as CSV with headers", async () => {
    await createTestTeam({ teamName: "Engineering" });

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
    const manager = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    await createTestTeam({ teamName: "Engineering", teamManagerId: manager.id });

    const csv = await exportTeamsCsv();
    expect(csv).toContain("Alice");
  });

  // Includes member names in export
  test("includes member names", async () => {
    const person = await createTestPerson({ name: "Bob", email: "bob@test.com" });
    const team = await createTestTeam({ teamName: "Design" });
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
    await createTestTeam({ teamName: "Active" });
    await testPrisma.team.create({ data: { teamName: "Deleted", deletedAt: new Date() } });

    const csv = await exportTeamsCsv();
    expect(csv).toContain("Active");
    expect(csv).not.toContain("Deleted");
  });
});

describe("exportDepartmentsCsv", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Exports departments with headers
  test("exports departments as CSV with headers", async () => {
    await createTestDepartment({ name: "Engineering" });

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
    const head = await createTestPerson({ name: "Alice", email: "alice@test.com" });
    await createTestDepartment({ name: "Engineering", headId: head.id });

    const csv = await exportDepartmentsCsv();
    expect(csv).toContain("Alice");
  });

  // Includes team count
  test("includes team count for departments", async () => {
    const dept = await createTestDepartment({ name: "Engineering" });
    await createTestTeam({ teamName: "TeamA", departmentId: dept.id });
    await createTestTeam({ teamName: "TeamB", departmentId: dept.id });

    const csv = await exportDepartmentsCsv();
    expect(csv).toContain("2"); // teamCount
  });

  // Excludes soft-deleted departments
  test("excludes soft-deleted departments", async () => {
    await createTestDepartment({ name: "Active" });
    await testPrisma.department.create({ data: { name: "Deleted", deletedAt: new Date() } });

    const csv = await exportDepartmentsCsv();
    expect(csv).toContain("Active");
    expect(csv).not.toContain("Deleted");
  });
});

describe("exportAuditLogsCsv", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Exports audit logs with headers
  test("exports audit logs as CSV with headers", async () => {
    await testPrisma.auditLog.create({
      data: {
        action: "create",
        entityType: "person",
        entityId: "abc-123",
        userEmail: "alice@test.com",
        after: '{"name":"Alice"}',
      },
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
    await testPrisma.auditLog.create({
      data: {
        action: "create",
        entityType: "person",
        userEmail: "first@test.com",
        createdAt: new Date("2026-01-01"),
      },
    });
    await testPrisma.auditLog.create({
      data: {
        action: "delete",
        entityType: "team",
        userEmail: "second@test.com",
        createdAt: new Date("2026-02-01"),
      },
    });

    const csv = await exportAuditLogsCsv();
    const secondIdx = csv.indexOf("second@test.com");
    const firstIdx = csv.indexOf("first@test.com");
    // Second log (newer) should appear before first log (older)
    expect(secondIdx).toBeLessThan(firstIdx);
  });
});

afterAll(() => testPrisma.$disconnect());
