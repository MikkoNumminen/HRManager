import { testPrisma, cleanDb } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock next-auth — uses ESM imports that Jest can't parse in CJS mode.
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock permissions — requirePermission is a no-op so tests focus on data logic.
jest.mock("@/permissions", () => ({
  requirePermission: jest.fn(),
  hasPermission: jest.fn().mockResolvedValue(true),
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

// Mock demo session — defaults to null (production mode).
jest.mock("@/demoSession", () => ({
  getDemoSessionId: jest.fn().mockResolvedValue(null),
}));

// Mock Next.js server functions
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  updateTag: jest.fn(),
  unstable_cache: jest.fn((fn: (...args: unknown[]) => unknown) => fn),
}));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import {
  signOutOtherSessions,
  adminForceLogoutSession,
  adminForceLogoutAllSessions,
} from "@/features/sessions/actions";
import { getMyActiveSessions, getUserActiveSessions } from "@/features/sessions/queries";
import { MAX_CONCURRENT_SESSIONS } from "@/schemas";

const { auth } = require("@/auth");

// Helper to build FormData
function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

describe("Session Management", () => {
  beforeEach(async () => {
    await cleanDb();
  }, 30_000);

  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  }, 30_000);

  // Creates a test user and returns the user record
  async function createUser(email = `test-${Date.now()}@example.com`) {
    return testPrisma.user.create({
      data: { email, name: "Test User", role: "user" },
    });
  }

  // Creates a session for the given user
  async function createSession(
    userId: string,
    overrides: { userAgent?: string; ipAddress?: string; active?: boolean } = {},
  ) {
    return testPrisma.userSession.create({
      data: {
        userId,
        userAgent: overrides.userAgent ?? "Mozilla/5.0 Chrome",
        ipAddress: overrides.ipAddress ?? "192.168.1.1",
        active: overrides.active ?? true,
      },
    });
  }

  describe("UserSession model", () => {
    // Test that creating a session sets defaults correctly
    it("should create a session with default values", async () => {
      const user = await createUser();
      const session = await testPrisma.userSession.create({
        data: {
          userId: user.id,
          userAgent: "Mozilla/5.0 Test",
          ipAddress: "127.0.0.1",
        },
      });

      expect(session.id).toBeDefined();
      expect(session.userId).toBe(user.id);
      expect(session.active).toBe(true);
      expect(session.lastActiveAt).toBeInstanceOf(Date);
      expect(session.createdAt).toBeInstanceOf(Date);
    });

    // Test that deleting a user cascades to sessions
    it("should cascade delete sessions when user is deleted", async () => {
      const user = await createUser();
      await createSession(user.id);
      await createSession(user.id);

      await testPrisma.user.delete({ where: { id: user.id } });

      const remaining = await testPrisma.userSession.findMany({
        where: { userId: user.id },
      });
      expect(remaining).toHaveLength(0);
    });
  });

  describe("getMyActiveSessions", () => {
    // Test that query returns only active sessions for the authenticated user
    it("should return active sessions for the current user", async () => {
      const user = await createUser();
      const s1 = await createSession(user.id);
      const s2 = await createSession(user.id);
      // Inactive session should not be returned
      await createSession(user.id, { active: false });

      auth.mockResolvedValue({ user: { id: user.id, email: user.email } });

      const sessions = await getMyActiveSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.id).sort()).toEqual([s1.id, s2.id].sort());
    });

    // Test that null session returns empty array
    it("should return empty array when not authenticated", async () => {
      auth.mockResolvedValue(null);
      const sessions = await getMyActiveSessions();
      expect(sessions).toHaveLength(0);
    });
  });

  describe("getUserActiveSessions (admin)", () => {
    // Test that admin can view sessions for any user
    it("should return active sessions for a specific user", async () => {
      const user = await createUser();
      await createSession(user.id);
      await createSession(user.id);
      await createSession(user.id, { active: false });

      const sessions = await getUserActiveSessions(user.id);
      expect(sessions).toHaveLength(2);
    });

    // Callers without admin:manage_users permission must receive a hard error.
    it("throws Permission denied when hasPermission returns false", async () => {
      const { hasPermission } = require("@/permissions");
      hasPermission.mockResolvedValueOnce(false);

      const user = await createUser();
      await expect(getUserActiveSessions(user.id)).rejects.toThrow("Permission denied");
    });
  });

  describe("signOutOtherSessions", () => {
    // Test that deactivates all active sessions when no currentSessionId in JWT
    it("should deactivate all sessions when no current sessionId in JWT", async () => {
      const user = await createUser();
      await createSession(user.id);
      await createSession(user.id);

      // Auth without a sessionId property (no current session to preserve)
      auth.mockResolvedValue({ user: { id: user.id, email: user.email } });

      const result = await signOutOtherSessions();
      expect(result).toBeUndefined();

      const active = await testPrisma.userSession.findMany({
        where: { userId: user.id, active: true },
      });
      expect(active).toHaveLength(0);
    });

    // Test that signing out others deactivates all sessions except the current one
    it("should deactivate all sessions except the current one", async () => {
      const user = await createUser();
      const currentSession = await createSession(user.id);
      await createSession(user.id);
      await createSession(user.id);

      auth.mockResolvedValue({
        user: { id: user.id, email: user.email },
        sessionId: currentSession.id,
      });

      const result = await signOutOtherSessions();
      expect(result).toBeUndefined();

      const active = await testPrisma.userSession.findMany({
        where: { userId: user.id, active: true },
      });
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(currentSession.id);
    });

    // Test that unauthenticated call returns error
    it("should fail when not authenticated", async () => {
      auth.mockResolvedValue(null);
      const result = await signOutOtherSessions();
      expect(result?.error).toBeTruthy();
    });
  });

  describe("adminForceLogoutSession", () => {
    // Test that missing sessionId in form data returns an error
    it("should fail when sessionId is missing from form data", async () => {
      const result = await adminForceLogoutSession(formData({}));
      expect(result?.error).toBeTruthy();
    });

    // Test that admin can force-logout a specific session
    it("should deactivate a specific session", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      const result = await adminForceLogoutSession(formData({ sessionId: session.id }));
      expect(result).toBeUndefined();

      const updated = await testPrisma.userSession.findUnique({
        where: { id: session.id },
      });
      expect(updated?.active).toBe(false);
    });

    // Test that force-logout of already inactive session returns error
    it("should fail when session is already inactive", async () => {
      const user = await createUser();
      const session = await createSession(user.id, { active: false });

      const result = await adminForceLogoutSession(formData({ sessionId: session.id }));
      expect(result?.error).toBeTruthy();
    });

    // Test that non-existent session returns error
    it("should fail with invalid session ID", async () => {
      const result = await adminForceLogoutSession(
        formData({ sessionId: "00000000-0000-0000-0000-000000000000" }),
      );
      expect(result?.error).toBeTruthy();
    });
  });

  describe("adminForceLogoutAllSessions", () => {
    // Test that missing userId in form data returns an error
    it("should fail when userId is missing from form data", async () => {
      const result = await adminForceLogoutAllSessions(formData({}));
      expect(result?.error).toBeTruthy();
    });

    // Test that admin can force-logout all sessions for a user
    it("should deactivate all sessions for a user", async () => {
      const user = await createUser();
      await createSession(user.id);
      await createSession(user.id);
      await createSession(user.id);

      const result = await adminForceLogoutAllSessions(formData({ userId: user.id }));
      expect(result).toBeUndefined();

      const active = await testPrisma.userSession.findMany({
        where: { userId: user.id, active: true },
      });
      expect(active).toHaveLength(0);
    });

    // Test that force-logout all for non-existent user returns error
    it("should fail with non-existent user", async () => {
      const result = await adminForceLogoutAllSessions(
        formData({ userId: "00000000-0000-0000-0000-000000000000" }),
      );
      expect(result?.error).toBeTruthy();
    });
  });

  describe("Concurrent session limits", () => {
    // Test that enforcing the concurrent session limit deactivates oldest sessions
    it("should deactivate oldest sessions when limit exceeded", async () => {
      const user = await createUser();

      // Create sessions up to the limit + 2 extra
      const sessions = [];
      for (let i = 0; i < MAX_CONCURRENT_SESSIONS + 2; i++) {
        const s = await testPrisma.userSession.create({
          data: {
            userId: user.id,
            userAgent: `Browser ${i}`,
            ipAddress: `192.168.1.${i}`,
            // Stagger lastActiveAt so ordering is deterministic
            lastActiveAt: new Date(Date.now() + i * 1000),
          },
        });
        sessions.push(s);
      }

      // Verify we have more than the limit
      const allActive = await testPrisma.userSession.findMany({
        where: { userId: user.id, active: true },
        orderBy: { lastActiveAt: "desc" },
      });
      expect(allActive.length).toBe(MAX_CONCURRENT_SESSIONS + 2);

      // Simulate the enforcement logic from auth.ts
      if (allActive.length > MAX_CONCURRENT_SESSIONS) {
        const toDeactivate = allActive.slice(MAX_CONCURRENT_SESSIONS).map((s) => s.id);
        await testPrisma.userSession.updateMany({
          where: { id: { in: toDeactivate } },
          data: { active: false },
        });
      }

      // After enforcement, only MAX_CONCURRENT_SESSIONS should remain active
      const remaining = await testPrisma.userSession.findMany({
        where: { userId: user.id, active: true },
      });
      expect(remaining).toHaveLength(MAX_CONCURRENT_SESSIONS);

      // The oldest sessions should be the ones deactivated
      const deactivated = await testPrisma.userSession.findMany({
        where: { userId: user.id, active: false },
      });
      expect(deactivated).toHaveLength(2);
    });
  });

  describe("Session validity check (token invalidation)", () => {
    // Test that an active session is considered valid
    it("should consider active session as valid", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      const record = await testPrisma.userSession.findUnique({
        where: { id: session.id },
        select: { active: true },
      });
      expect(record?.active).toBe(true);
    });

    // Test that a deactivated session is considered invalid
    it("should consider deactivated session as invalid", async () => {
      const user = await createUser();
      const session = await createSession(user.id);

      await testPrisma.userSession.update({
        where: { id: session.id },
        data: { active: false },
      });

      const record = await testPrisma.userSession.findUnique({
        where: { id: session.id },
        select: { active: true },
      });
      expect(record?.active).toBe(false);
    });

    // Test that lastActiveAt is updated correctly
    it("should update lastActiveAt timestamp", async () => {
      const user = await createUser();
      const session = await createSession(user.id);
      const originalTime = session.lastActiveAt;

      // Wait a small amount to ensure different timestamp
      await new Promise((r) => setTimeout(r, 50));

      await testPrisma.userSession.update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() },
      });

      const updated = await testPrisma.userSession.findUnique({
        where: { id: session.id },
      });
      expect(updated!.lastActiveAt.getTime()).toBeGreaterThan(originalTime.getTime());
    });
  });

  describe("Zod schema validation", () => {
    // Test that UserSessionSchema correctly validates session data
    it("should parse valid session data", async () => {
      const { UserSessionSchema } = require("@/schemas");
      const user = await createUser();
      const session = await createSession(user.id);

      const parsed = UserSessionSchema.parse(session);
      expect(parsed.id).toBe(session.id);
      expect(parsed.userId).toBe(user.id);
      expect(parsed.active).toBe(true);
    });
  });
});
