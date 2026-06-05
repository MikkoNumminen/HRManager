import { testPrisma, cleanDb } from "./testDb";

// Regression coverage for the 2FA-bypass fix, read side: the jwt callback must
// derive `twoFactorVerified` from UserSession.twoFactorVerifiedAt and must NOT
// honour a client-supplied value. We exercise the REAL callback (authConfig),
// mocking only the next-auth runtime so its ESM internals don't need transforms.

process.env.AUTH_SECRET ??= "test-auth-secret-at-least-32-characters-long";
process.env.TOTP_ENCRYPTION_KEY ??= "test-encryption-key-for-totp-at-least-32-chars";

jest.mock("@/db", () => ({ prisma: require("./testDb").testPrisma }));
// headers() is only used by getRequestMeta() on sign-in; stub it so importing
// @/auth in the node test environment is safe.
jest.mock("next/headers", () => ({ headers: jest.fn(async () => new Headers()) }));

// Mock the next-auth runtime + providers so importing @/auth does not load
// next-auth's untransformed ESM. authConfig (with the real callbacks) is still
// defined and exported by @/auth — only NextAuth()/the providers are stubbed.
jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    handlers: {},
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
}));
jest.mock("next-auth/providers/google", () => ({ __esModule: true, default: jest.fn(() => ({})) }));
jest.mock("next-auth/providers/github", () => ({ __esModule: true, default: jest.fn(() => ({})) }));
jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

import { authConfig } from "@/auth";

const jwt = authConfig.callbacks.jwt;
type JwtArgs = Parameters<typeof jwt>[0];

describe("auth jwt callback — 2FA verification is server-derived, not client-set", () => {
  let user: { id: string; email: string };

  beforeEach(async () => {
    await cleanDb();
    user = await testPrisma.user.create({
      data: { email: "jwt2fa@example.com", name: "JWT 2FA", role: "user", permissionsVersion: 0 },
    });
  }, 30_000);

  it("ignores a client-supplied twoFactorVerified=true when the session is not stamped", async () => {
    const userSession = await testPrisma.userSession.create({
      data: { userId: user.id, twoFactorVerifiedAt: null },
    });
    // Seed a STALE/forged `true` on the token: the server must force it back to
    // false because the session row is not stamped — proving the flag is derived
    // from the DB, not carried over from the token or the client update payload.
    const token = {
      email: user.email,
      sessionId: userSession.id,
      role: "user",
      permissionsVersion: 0,
      twoFactorVerified: true,
    };

    // The malicious client payload also attempts to flip the flag directly.
    const result = await jwt({
      token,
      trigger: "update",
      session: { twoFactorVerified: true },
    } as unknown as JwtArgs);

    expect(result.twoFactorVerified).toBe(false);
  });

  it("derives twoFactorVerified=true only after the session is stamped server-side", async () => {
    const userSession = await testPrisma.userSession.create({
      data: { userId: user.id, twoFactorVerifiedAt: new Date() },
    });
    const token = {
      email: user.email,
      sessionId: userSession.id,
      role: "user",
      permissionsVersion: 0,
      twoFactorVerified: false,
    };

    const result = await jwt({ token, trigger: "update", session: {} } as unknown as JwtArgs);

    expect(result.twoFactorVerified).toBe(true);
  });
});
