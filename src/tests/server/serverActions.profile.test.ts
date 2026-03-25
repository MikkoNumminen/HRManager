import { testPrisma, cleanDb } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock next-auth — auth() is called directly in profile actions, not via permissions.
const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock permissions — requirePermission is used transitively; resolvePermissions is called by getProfile.
jest.mock("@/permissions", () => ({
  requirePermission: jest.fn(),
  seedPermissions: jest.fn(),
  resolvePermissions: jest.fn().mockResolvedValue({}),
}));

// Mock audit logging — deferAudit calls after() which needs request scope.
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

// Mock Next.js server functions.
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

import { updateProfileName, updateProfileImage } from "@/features/profile/actions";
import { getProfile } from "@/features/profile/queries";

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

// ─── updateProfileName ─────────────────────────────────────────

describe("updateProfileName", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Returns notAuthenticated when auth() returns no session.
  test("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await updateProfileName(formData({ name: "Alice" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects empty name.
  test("rejects empty name", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "some-id" } });
    const result = await updateProfileName(formData({ name: "" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects name exceeding MAX_NAME_LENGTH.
  test("rejects name exceeding max length", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "some-id" } });
    const result = await updateProfileName(formData({ name: "a".repeat(256) }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Returns userNotFound when user ID does not exist in DB.
  test("returns error when user not found in DB", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "00000000-0000-0000-0000-000000000000" },
    });
    const result = await updateProfileName(formData({ name: "Alice" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Successfully updates profile name.
  test("updates name successfully", async () => {
    const user = await testPrisma.user.create({
      data: { email: "alice@test.com", name: "Old Name", role: "administrator" },
    });
    mockAuth.mockResolvedValueOnce({ user: { id: user.id } });
    const result = await updateProfileName(formData({ name: "New Name" }));
    expect(result).toBeUndefined();
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.name).toBe("New Name");
  });
});

// ─── updateProfileImage ─────────────────────────────────────────

describe("updateProfileImage", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Returns notAuthenticated when auth() returns no session.
  test("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await updateProfileImage(
      formData({ image: "https://avatars.githubusercontent.com/u/1" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects a URL with a non-http(s) protocol (ftp://) — covers line 65 invalidUrlProtocol.
  test("rejects image URL with non-http(s) protocol (ftp)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "some-id" } });
    const result = await updateProfileImage(
      formData({ image: "ftp://avatars.githubusercontent.com/u/1" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects a URL that is not a valid URL format — covers line 67 invalidUrlFormat.
  test("rejects image URL with invalid format", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "some-id" } });
    const result = await updateProfileImage(formData({ image: "not-a-url" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects a URL from a domain not in the allowlist — covers line 69 imageUrlDomainNotAllowed.
  test("rejects image URL from domain not in allowlist", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "some-id" } });
    const result = await updateProfileImage(formData({ image: "https://evil.com/avatar.png" }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // Rejects a URL that exceeds MAX_URL_LENGTH — covers line 70 urlTooLong fallback.
  test("rejects image URL that exceeds max URL length", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "some-id" } });
    const longUrl = "https://avatars.githubusercontent.com/u/" + "a".repeat(3000);
    const result = await updateProfileImage(formData({ image: longUrl }));
    expect(result).toMatchObject({ error: expect.any(String) });
  });

  // No image field provided — falls back to "" via ?? operator (line 57 false branch).
  test("clears image when no image field is provided", async () => {
    const user = await testPrisma.user.create({
      data: {
        email: "noimg@test.com",
        name: "NoImg",
        role: "administrator",
        image: "https://example.com/x.png",
      },
    });
    mockAuth.mockResolvedValueOnce({ user: { id: user.id } });
    // No "image" key in formData — data.get("image") returns null → trimmed = ""
    const result = await updateProfileImage(formData({}));
    expect(result).toBeUndefined();
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.image).toBeNull();
  });

  // Empty image string clears the image to null.
  test("clears image when empty string is provided", async () => {
    const user = await testPrisma.user.create({
      data: {
        email: "bob@test.com",
        name: "Bob",
        role: "administrator",
        image: "https://example.com/old.png",
      },
    });
    mockAuth.mockResolvedValueOnce({ user: { id: user.id } });
    const result = await updateProfileImage(formData({ image: "" }));
    expect(result).toBeUndefined();
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.image).toBeNull();
  });

  // Successfully updates profile image to a valid URL.
  test("updates image successfully with valid allowlisted URL", async () => {
    const user = await testPrisma.user.create({
      data: { email: "carol@test.com", name: "Carol", role: "administrator" },
    });
    mockAuth.mockResolvedValueOnce({ user: { id: user.id } });
    const result = await updateProfileImage(
      formData({ image: "https://avatars.githubusercontent.com/u/1234" }),
    );
    expect(result).toBeUndefined();
    const updated = await testPrisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.image).toBe("https://avatars.githubusercontent.com/u/1234");
  });

  // Returns userNotFound when user ID does not exist in DB.
  test("returns error when user not found in DB", async () => {
    mockAuth.mockResolvedValueOnce({
      user: { id: "00000000-0000-0000-0000-000000000000" },
    });
    const result = await updateProfileImage(
      formData({ image: "https://avatars.githubusercontent.com/u/1" }),
    );
    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

// ─── getProfile ─────────────────────────────────────────

describe("getProfile", () => {
  beforeEach(() => cleanDb());
  afterAll(() => cleanDb());

  // Returns null when not authenticated.
  test("returns null when not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const result = await getProfile();
    expect(result).toBeNull();
  });

  // Returns null when user does not exist in DB.
  test("returns null when user not found in DB", async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: "ghost@test.com" } });
    const result = await getProfile();
    expect(result).toBeNull();
  });

  // Returns UserProfile for an existing user.
  test("returns UserProfile for authenticated user", async () => {
    const user = await testPrisma.user.create({
      data: { email: "profile@test.com", name: "Profile User", role: "administrator" },
    });
    mockAuth.mockResolvedValueOnce({ user: { email: user.email } });
    const result = await getProfile();
    expect(result).not.toBeNull();
    expect(result!.email).toBe("profile@test.com");
  });

  // Returns UserProfile for a user with permissions — exercises the map callback (arrow fn coverage).
  test("returns UserProfile with user permissions mapped", async () => {
    const user = await testPrisma.user.create({
      data: { email: "perm@test.com", name: "Perm User", role: "user" },
    });
    const perm = await testPrisma.permission.create({
      data: { key: "test:read", description: "Test permission" },
    });
    await testPrisma.userPermission.create({
      data: { userId: user.id, permissionId: perm.id, granted: true },
    });
    mockAuth.mockResolvedValueOnce({ user: { email: user.email } });
    const result = await getProfile();
    expect(result).not.toBeNull();
    expect(result!.email).toBe("perm@test.com");
  });
});
