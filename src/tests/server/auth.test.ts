import { testPrisma, cleanDb } from "./testDb";

// Capture the NextAuth config so we can test callbacks directly.
// Use globalThis to avoid TDZ issues — jest.mock is hoisted above all declarations.
jest.mock("next-auth", () => ({
  __esModule: true,
  default: (config: Record<string, unknown>) => {
    (globalThis as Record<string, unknown>).__authConfig = config;
    return { handlers: {}, auth: jest.fn(), signIn: jest.fn(), signOut: jest.fn() };
  },
}));

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
  });
});
