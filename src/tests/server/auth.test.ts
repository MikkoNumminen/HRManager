import { testPrisma, cleanDb } from "./testDb";

// Capture the NextAuth config so we can test callbacks directly.
// Use globalThis to avoid TDZ issues — jest.mock is hoisted above all declarations.
// Set NEXT_PUBLIC_DEMO_LOGIN inside the factory so the demo Credentials provider
// is included when auth.ts evaluates (jest.mock factories run before module code).
jest.mock("next-auth", () => {
  process.env.NEXT_PUBLIC_DEMO_LOGIN = "true";
  return {
    __esModule: true,
    default: (config: Record<string, unknown>) => {
      (globalThis as Record<string, unknown>).__authConfig = config;
      return { handlers: {}, auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() };
    },
  };
});

// Mock providers — NextAuth v5 provider constructors return objects
jest.mock("next-auth/providers/google", () => ({ __esModule: true, default: {} }));
jest.mock("next-auth/providers/github", () => ({ __esModule: true, default: {} }));
jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: (config: Record<string, unknown>) => config,
}));

// Use the test database for all Prisma operations
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock demo session helpers — authorize() calls these but we test them separately
jest.mock("@/demoSession", () => ({
  seedDemoData: jest.fn(() => Promise.resolve()),
  cleanupStaleDemoSessions: jest.fn(() => Promise.resolve(0)),
}));

// Import auth.ts to trigger NextAuth() and capture the config
import "@/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let callbacks: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let credentialsProvider: any;

beforeAll(() => {
  const config = (globalThis as Record<string, unknown>).__authConfig as Record<string, unknown>;
  callbacks = config.callbacks;
  // The Credentials provider is the third entry (Google, GitHub, Credentials)
  credentialsProvider = (config.providers as unknown[])[2];
});

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  await testPrisma.$disconnect();
});

describe("auth.ts callbacks", () => {
  describe("signIn callback", () => {
    // Rejects sign-in when user has no email.
    test("returns false when user has no email", async () => {
      const result = await callbacks.signIn({ user: {} });
      expect(result).toBe(false);
    });

    // Creates a new user in the database on first sign-in.
    test("creates a new user on first sign-in", async () => {
      const result = await callbacks.signIn({
        user: { email: "new@example.com", name: "New User", image: "https://img.com/a.png" },
      });
      expect(result).toBe(true);
      const dbUser = await testPrisma.user.findUnique({ where: { email: "new@example.com" } });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.name).toBe("New User");
      expect(dbUser!.image).toBe("https://img.com/a.png");
    });

    // First user to sign in gets the superuser role.
    test("assigns superuser role to the first user", async () => {
      await callbacks.signIn({
        user: { email: "first@example.com", name: "First" },
      });
      const dbUser = await testPrisma.user.findUnique({ where: { email: "first@example.com" } });
      expect(dbUser!.role).toBe("superuser");
    });

    // Second user gets the regular user role.
    test("assigns user role to subsequent users", async () => {
      await testPrisma.user.create({
        data: { email: "existing@example.com", name: "Existing", role: "superuser" },
      });
      await callbacks.signIn({
        user: { email: "second@example.com", name: "Second" },
      });
      const dbUser = await testPrisma.user.findUnique({ where: { email: "second@example.com" } });
      expect(dbUser!.role).toBe("user");
    });

    // Does not create a duplicate user on subsequent sign-ins.
    test("does not create duplicate user on repeat sign-in", async () => {
      await testPrisma.user.create({
        data: { email: "alice@example.com", name: "Alice", role: "administrator" },
      });
      const result = await callbacks.signIn({
        user: { email: "alice@example.com", name: "Alice" },
      });
      expect(result).toBe(true);
      const count = await testPrisma.user.count({ where: { email: "alice@example.com" } });
      expect(count).toBe(1);
    });

    // Handles null name and image gracefully.
    test("creates user with null name and image when not provided", async () => {
      await callbacks.signIn({ user: { email: "minimal@example.com" } });
      const dbUser = await testPrisma.user.findUnique({ where: { email: "minimal@example.com" } });
      expect(dbUser!.name).toBeNull();
      expect(dbUser!.image).toBeNull();
    });
  });

  describe("jwt callback", () => {
    // Returns token unchanged when email is missing.
    test("returns token unchanged when email is missing", async () => {
      const token = { sub: "123" };
      const result = await callbacks.jwt({ token, trigger: "signIn" });
      expect(result).toEqual(token);
    });

    // Enriches token with user data on signIn trigger.
    test("enriches token with userId, role, and permissions on signIn", async () => {
      const user = await testPrisma.user.create({
        data: { email: "jwt@example.com", name: "JWT User", role: "administrator" },
      });
      const token = { email: "jwt@example.com" };
      const result = await callbacks.jwt({ token, trigger: "signIn" });
      expect(result.userId).toBe(user.id);
      expect(result.role).toBe("administrator");
      expect(result.permissions).toBeDefined();
      expect(typeof result.permissions).toBe("object");
    });

    // Enriches token when role is missing (regardless of trigger).
    test("enriches token when role is missing even without signIn trigger", async () => {
      await testPrisma.user.create({
        data: { email: "norole@example.com", name: "No Role", role: "user" },
      });
      const token = { email: "norole@example.com" };
      const result = await callbacks.jwt({ token, trigger: undefined });
      expect(result.role).toBe("user");
      expect(result.permissions).toBeDefined();
    });

    // Skips full refresh when user exists, role matches, and permissionsVersion matches.
    test("skips full refresh when token has matching role and permissionsVersion", async () => {
      const user = await testPrisma.user.create({
        data: { email: "skip@example.com", name: "Skip", role: "administrator" },
      });
      // Simulate a token that already has role + permissionsVersion matching the DB
      const token = {
        email: "skip@example.com",
        role: "administrator",
        permissions: { "person:read": true },
        permissionsVersion: user.permissionsVersion,
      };
      const result = await callbacks.jwt({ token, trigger: undefined });
      // Should keep existing permissions — no full refresh needed
      expect(result.role).toBe("administrator");
      expect(result.permissions).toEqual({ "person:read": true });
    });

    // Clears token fields when user is not found (e.g. kicked out).
    test("clears token when user not found in database", async () => {
      const token = {
        email: "ghost@example.com",
        userId: "old-id",
        role: "user",
        permissions: { "person:read": true },
      };
      const result = await callbacks.jwt({ token, trigger: "signIn" });
      expect(result.userId).toBeUndefined();
      expect(result.role).toBeUndefined();
      expect(result.permissions).toBeUndefined();
    });

    // Clears token when user is kicked out between JWT refreshes.
    test("invalidates token after user is kicked out", async () => {
      const user = await testPrisma.user.create({
        data: { email: "kickable@example.com", name: "Kickable", role: "user" },
      });
      // First JWT call — user exists, token is enriched
      const token = { email: "kickable@example.com" };
      const enriched = await callbacks.jwt({ token, trigger: "signIn" });
      expect(enriched.userId).toBe(user.id);
      expect(enriched.role).toBe("user");

      // Kick out the user (delete from DB)
      await testPrisma.user.delete({ where: { id: user.id } });

      // Next JWT call — user no longer exists, token should be cleared
      const cleared = await callbacks.jwt({ token: enriched, trigger: undefined });
      expect(cleared.userId).toBeUndefined();
      expect(cleared.role).toBeUndefined();
      expect(cleared.permissions).toBeUndefined();
    });

    // Does a full refresh when permissionsVersion changes in the database.
    test("refreshes permissions when permissionsVersion changes", async () => {
      const user = await testPrisma.user.create({
        data: { email: "refresh@example.com", name: "Refresh", role: "user" },
      });
      // Simulate a token with an outdated permissionsVersion
      const token = {
        email: "refresh@example.com",
        userId: user.id,
        role: "user",
        permissions: { "person:read": false },
        permissionsVersion: user.permissionsVersion,
      };
      // Bump permissionsVersion in the DB to simulate a permission change
      await testPrisma.user.update({
        where: { id: user.id },
        data: { permissionsVersion: { increment: 1 } },
      });
      const result = await callbacks.jwt({ token, trigger: undefined });
      // Should have re-fetched permissions — the old override should be replaced
      expect(result.permissionsVersion).toBe(user.permissionsVersion + 1);
      expect(result.permissions).toBeDefined();
      expect(typeof result.permissions).toBe("object");
    });

    // Does a full refresh when role changes in the database.
    test("refreshes permissions when role changes in database", async () => {
      const user = await testPrisma.user.create({
        data: { email: "rolechange@example.com", name: "RoleChange", role: "user" },
      });
      const token = {
        email: "rolechange@example.com",
        userId: user.id,
        role: "user",
        permissions: {},
        permissionsVersion: user.permissionsVersion,
      };
      // Change role in DB
      await testPrisma.user.update({
        where: { id: user.id },
        data: { role: "administrator" },
      });
      const result = await callbacks.jwt({ token, trigger: undefined });
      expect(result.role).toBe("administrator");
      expect(result.permissions).toBeDefined();
    });

    // Re-fetches permission overrides when role changes via lightweight path.
    test("refreshes overrides via lightweight path when role changes", async () => {
      const user = await testPrisma.user.create({
        data: { email: "lwrefresh@example.com", name: "LWRefresh", role: "user" },
      });
      const perm = await testPrisma.permission.upsert({
        where: { key: "person:create" },
        update: {},
        create: { key: "person:create", description: "Create person" },
      });
      await testPrisma.userPermission.create({
        data: { userId: user.id, permissionId: perm.id, granted: true },
      });
      const token = {
        email: "lwrefresh@example.com",
        userId: user.id,
        role: "user",
        permissions: {},
        permissionsVersion: user.permissionsVersion,
      };
      // Change role in DB to trigger lightweight path mismatch
      await testPrisma.user.update({
        where: { id: user.id },
        data: { role: "administrator" },
      });
      const result = await callbacks.jwt({ token, trigger: undefined });
      expect(result.role).toBe("administrator");
      // The permission override should be included after the full refresh
      expect(result.permissions["person:create"]).toBe(true);
    });

    // Clears token when user is kicked out and detected via lightweight path.
    test("clears token via lightweight path when user is deleted", async () => {
      const user = await testPrisma.user.create({
        data: { email: "lwkick@example.com", name: "LWKick", role: "user" },
      });
      const token = {
        email: "lwkick@example.com",
        userId: user.id,
        role: "user",
        permissions: { "person:read": true },
        permissionsVersion: user.permissionsVersion,
      };
      // Delete the user
      await testPrisma.user.delete({ where: { id: user.id } });
      // Lightweight path should detect missing user and clear token
      const result = await callbacks.jwt({ token, trigger: undefined });
      expect(result.userId).toBeUndefined();
      expect(result.role).toBeUndefined();
      expect(result.permissions).toBeUndefined();
    });

    // Includes permission overrides when user has custom permissions.
    test("includes permission overrides in resolved permissions", async () => {
      const user = await testPrisma.user.create({
        data: { email: "perms@example.com", name: "Perms", role: "user" },
      });
      const perm = await testPrisma.permission.create({
        data: { key: "person:create", description: "Create person" },
      });
      await testPrisma.userPermission.create({
        data: { userId: user.id, permissionId: perm.id, granted: true },
      });
      const token = { email: "perms@example.com" };
      const result = await callbacks.jwt({ token, trigger: "signIn" });
      expect(result.permissions["person:create"]).toBe(true);
    });
  });

  describe("jwt callback — demoSessionId", () => {
    // Persists demoSessionId from user on signIn trigger.
    test("persists demoSessionId from user on signIn", async () => {
      await testPrisma.user.create({
        data: { email: "demo@hrmanager.app", name: "Demo", role: "superuser" },
      });
      const token = { email: "demo@hrmanager.app" };
      const user = { demoSessionId: "demo-sess-123" };
      const result = await callbacks.jwt({ token, trigger: "signIn", user });
      expect(result.demoSessionId).toBe("demo-sess-123");
    });

    // Does not set demoSessionId when user has none (OAuth user).
    test("does not set demoSessionId for non-demo user", async () => {
      await testPrisma.user.create({
        data: { email: "oauth@example.com", name: "OAuth", role: "user" },
      });
      const token = { email: "oauth@example.com" };
      const user = {};
      const result = await callbacks.jwt({ token, trigger: "signIn", user });
      expect(result.demoSessionId).toBeUndefined();
    });
  });

  describe("session callback", () => {
    // Copies userId from token to session.
    test("copies userId from token to session", async () => {
      const session = { user: {} } as Record<string, Record<string, unknown>>;
      const token = { userId: "abc-123", role: "admin", permissions: { "person:read": true } };
      const result = await callbacks.session({ session, token });
      expect(result.user.id).toBe("abc-123");
    });

    // Copies role from token to session.
    test("copies role from token to session", async () => {
      const session = { user: {} } as Record<string, Record<string, unknown>>;
      const token = { userId: "abc", role: "administrator", permissions: {} };
      const result = await callbacks.session({ session, token });
      expect(result.user.role).toBe("administrator");
    });

    // Copies permissions from token to session.
    test("copies permissions from token to session", async () => {
      const session = { user: {} } as Record<string, Record<string, unknown>>;
      const token = { userId: "abc", role: "user", permissions: { "team:read": true } };
      const result = await callbacks.session({ session, token });
      expect(result.user.permissions).toEqual({ "team:read": true });
    });

    // Returns session unchanged when token has no enrichment data.
    test("returns session unchanged when token has no enrichment", async () => {
      const session = { user: { name: "Test" } } as Record<string, Record<string, unknown>>;
      const token = {};
      const result = await callbacks.session({ session, token });
      expect(result.user.id).toBeUndefined();
      expect(result.user.role).toBeUndefined();
      expect(result.user.permissions).toBeUndefined();
    });

    // Copies demoSessionId from token to session.
    test("copies demoSessionId from token to session", async () => {
      const session = { user: {} } as Record<string, Record<string, unknown>>;
      const token = { userId: "abc", role: "superuser", permissions: {}, demoSessionId: "ds-1" };
      const result = await callbacks.session({ session, token });
      expect(result.user.demoSessionId).toBe("ds-1");
    });

    // Does not set demoSessionId when token has none.
    test("does not set demoSessionId when token has none", async () => {
      const session = { user: {} } as Record<string, Record<string, unknown>>;
      const token = { userId: "abc", role: "user", permissions: {} };
      const result = await callbacks.session({ session, token });
      expect(result.user.demoSessionId).toBeUndefined();
    });
  });

  describe("demo credentials provider", () => {
    // Creates a demo user when one does not exist.
    test("creates demo user on first authorize call", async () => {
      const result = await credentialsProvider.authorize();
      expect(result).not.toBeNull();
      expect(result.email).toBe("demo@hrmanager.app");
      expect(result.name).toBe("Demo User");
      const dbUser = await testPrisma.user.findUnique({
        where: { email: "demo@hrmanager.app" },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser!.role).toBe("superuser");
    });

    // Reuses existing demo user on subsequent authorize calls.
    test("reuses existing demo user on subsequent calls", async () => {
      // First call creates the user
      await credentialsProvider.authorize();
      // Second call reuses the user
      const result = await credentialsProvider.authorize();
      expect(result.email).toBe("demo@hrmanager.app");
      const count = await testPrisma.user.count({ where: { email: "demo@hrmanager.app" } });
      expect(count).toBe(1);
    });

    // Upgrades existing demo user to superuser if they have a lower role.
    test("upgrades existing demo user to superuser on login", async () => {
      await testPrisma.user.create({
        data: { email: "demo@hrmanager.app", name: "Demo User", role: "administrator" },
      });
      const result = await credentialsProvider.authorize();
      expect(result.email).toBe("demo@hrmanager.app");
      const dbUser = await testPrisma.user.findUnique({
        where: { email: "demo@hrmanager.app" },
      });
      expect(dbUser!.role).toBe("superuser");
    });

    // Returns id, email, and name in the result.
    test("returns user id, email, and name", async () => {
      const result = await credentialsProvider.authorize();
      expect(result.id).toBeDefined();
      expect(result.email).toBe("demo@hrmanager.app");
      expect(result.name).toBe("Demo User");
    });

    // Creates a DemoSession row and returns its ID.
    test("creates a DemoSession and returns demoSessionId", async () => {
      const result = await credentialsProvider.authorize();
      expect(result.demoSessionId).toBeDefined();

      const session = await testPrisma.demoSession.findUnique({
        where: { id: result.demoSessionId },
      });
      expect(session).not.toBeNull();
      expect(session!.userId).toBe(result.id);
    });

    // Calls seedDemoData with the new session ID.
    test("calls seedDemoData with the new session ID", async () => {
      const { seedDemoData } = require("@/demoSession") as { seedDemoData: jest.Mock };
      seedDemoData.mockClear();

      const result = await credentialsProvider.authorize();
      expect(seedDemoData).toHaveBeenCalledWith(result.demoSessionId);
    });

    // Calls cleanupStaleDemoSessions in the background.
    test("calls cleanupStaleDemoSessions", async () => {
      const { cleanupStaleDemoSessions } = require("@/demoSession") as {
        cleanupStaleDemoSessions: jest.Mock;
      };
      cleanupStaleDemoSessions.mockClear();

      await credentialsProvider.authorize();
      expect(cleanupStaleDemoSessions).toHaveBeenCalled();
    });
  });
});
