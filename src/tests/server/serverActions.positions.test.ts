import { testPrisma, cleanDb, createTestPerson } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock next-auth — ESM imports that Jest can't parse in CJS mode.
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock permissions — requirePermission is a no-op so position action tests focus on data logic.
jest.mock("@/permissions", () => ({
  requirePermission: jest.fn(),
  seedPermissions: jest.fn(),
}));

// Mock audit logging — deferAudit calls auth() and after() which need request scope.
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
const mockGetDemoSessionId = jest.fn().mockResolvedValue(null);
jest.mock("@/demoSession", () => ({
  getDemoSessionId: () => mockGetDemoSessionId(),
}));

// Mock Next.js server functions.
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import { createPositionEntry, deletePositionEntry } from "@/features/positions/actions";
import { updatePosition } from "@/features/persons/actions";

// Helper to build FormData from key-value pairs.
function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

// Helper to create a position directly in the DB.
async function createTestPosition(
  overrides: Partial<{
    name: string;
    sessionId: string | null;
  }> = {},
) {
  return testPrisma.position.create({
    data: {
      name: overrides.name ?? `Position ${Date.now()}`,
      sessionId: overrides.sessionId ?? null,
    },
  });
}

// Clean up positions table in addition to the shared cleanDb tables.
async function cleanAll() {
  await testPrisma.position.deleteMany();
  await cleanDb();
}

// ─── createPositionEntry ──────────────────────────────────────

describe("createPositionEntry", () => {
  beforeEach(() => cleanAll());
  afterAll(() => cleanAll());

  // Creates a position entry in the DB when given a valid name.
  test("success creates a position in the DB", async () => {
    await createPositionEntry(formData({ name: "Software Engineer" }));
    const positions = await testPrisma.position.findMany({ where: { deletedAt: null } });
    expect(positions).toHaveLength(1);
    expect(positions[0].name).toBe("Software Engineer");
  });

  // Returns an error when the position name is empty (invalidName).
  test("returns error when name is missing (invalidName)", async () => {
    const result = await createPositionEntry(formData({ name: "" }));
    expect(result).toMatchObject({ error: expect.any(String) });
    const positions = await testPrisma.position.findMany();
    expect(positions).toHaveLength(0);
  });

  // Returns an error when the position name exceeds MAX_POSITION_LENGTH (positionTooLong).
  test("returns error when name is too long (positionTooLong)", async () => {
    const longName = "A".repeat(256);
    const result = await createPositionEntry(formData({ name: longName }));
    expect(result).toMatchObject({ error: expect.any(String) });
    const positions = await testPrisma.position.findMany();
    expect(positions).toHaveLength(0);
  });

  // Returns an error when a position with the same name already exists (positionAlreadyExists).
  test("returns error when position already exists (positionAlreadyExists)", async () => {
    await createTestPosition({ name: "Product Manager" });
    const result = await createPositionEntry(formData({ name: "Product Manager" }));
    expect(result).toMatchObject({ error: expect.any(String) });
    const positions = await testPrisma.position.findMany({ where: { deletedAt: null } });
    expect(positions).toHaveLength(1);
  });
});

// ─── deletePositionEntry ──────────────────────────────────────

describe("deletePositionEntry", () => {
  beforeEach(() => cleanAll());
  afterAll(() => cleanAll());

  // Soft-deletes a position by setting deletedAt on success.
  test("success soft-deletes position (sets deletedAt)", async () => {
    const pos = await createTestPosition({ name: "Designer" });
    await deletePositionEntry(formData({ id: pos.id }));
    const deleted = await testPrisma.position.findUnique({ where: { id: pos.id } });
    expect(deleted!.deletedAt).not.toBeNull();
  });

  // Returns an error when the given ID does not match any active position (positionNotFound).
  test("returns error when ID not found (positionNotFound)", async () => {
    const result = await deletePositionEntry(
      formData({ id: "00000000-0000-0000-0000-000000000000" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Returns an error when no ID is provided in the form data.
  test("returns error when ID is missing", async () => {
    const result = await deletePositionEntry(formData({}));
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

// ─── updatePosition (catalog sync) ───────────────────────────

describe("updatePosition", () => {
  beforeEach(() => cleanAll());
  afterAll(() => cleanAll());

  // After updating a person's position, the new position name is synced into the Position catalog.
  test("syncs position name to catalog after setting person's position", async () => {
    const person = await createTestPerson({ name: "Alice" });
    const newPosition = "Staff Engineer";

    await updatePosition(formData({ personID: person.id, position: newPosition }));

    const catalogEntry = await testPrisma.position.findFirst({
      where: { name: newPosition },
    });
    expect(catalogEntry).not.toBeNull();
    expect(catalogEntry!.name).toBe(newPosition);
  });
});
