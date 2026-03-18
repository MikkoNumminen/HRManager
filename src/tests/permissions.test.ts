import { resolvePermissions, ROLE_DEFAULTS, PERMISSION_KEYS } from "../permissions";

jest.mock("../auth", () => ({
  auth: jest.fn(),
}));

jest.mock("../db", () => ({
  prisma: {},
}));

describe("Permission Resolution", () => {
  // Superuser gets all permissions no matter what overrides say
  test("superuser always has all permissions regardless of overrides", async () => {
    const overrides = [{ key: "person:create", granted: false }];
    const result = await resolvePermissions("superuser", overrides);

    for (const key of PERMISSION_KEYS) {
      expect(result[key]).toBe(true);
    }
  });

  // Administrator gets the default admin permissions
  test("administrator gets default admin permissions", async () => {
    const result = await resolvePermissions("administrator", []);

    expect(result["person:create"]).toBe(true);
    expect(result["person:delete"]).toBe(true);
    expect(result["team:create"]).toBe(true);
    expect(result["data:reset"]).toBe(false);
    expect(result["admin:manage_users"]).toBe(false);
  });

  // Regular user can only read by default
  test("user gets read-only permissions by default", async () => {
    const result = await resolvePermissions("user", []);

    expect(result["person:read"]).toBe(true);
    expect(result["team:read"]).toBe(true);
    expect(result["person:create"]).toBe(false);
    expect(result["team:create"]).toBe(false);
    expect(result["admin:manage_users"]).toBe(false);
  });

  // Guest gets the same read-only permissions as user
  test("guest gets read-only permissions", async () => {
    const result = await resolvePermissions("guest", []);

    expect(result["person:read"]).toBe(true);
    expect(result["team:read"]).toBe(true);
    expect(result["person:create"]).toBe(false);
  });

  // Overrides can grant a permission that is denied by default
  test("override can grant a permission denied by role default", async () => {
    const overrides = [{ key: "person:create", granted: true }];
    const result = await resolvePermissions("user", overrides);

    expect(result["person:create"]).toBe(true);
  });

  // Overrides can deny a permission that is allowed by default
  test("override can deny a permission allowed by role default", async () => {
    const overrides = [{ key: "person:create", granted: false }];
    const result = await resolvePermissions("administrator", overrides);

    expect(result["person:create"]).toBe(false);
  });

  // Unknown roles fall back to guest permissions
  test("unknown role falls back to guest defaults", async () => {
    const result = await resolvePermissions("nonexistent", []);

    expect(result["person:read"]).toBe(true);
    expect(result["person:create"]).toBe(false);
  });

  // All permission keys are present in the result
  test("result contains all permission keys", async () => {
    const result = await resolvePermissions("user", []);

    for (const key of PERMISSION_KEYS) {
      expect(key in result).toBe(true);
    }
  });

  // Role defaults map has all four roles defined
  test("ROLE_DEFAULTS has entries for all four roles", () => {
    expect(ROLE_DEFAULTS).toHaveProperty("superuser");
    expect(ROLE_DEFAULTS).toHaveProperty("administrator");
    expect(ROLE_DEFAULTS).toHaveProperty("user");
    expect(ROLE_DEFAULTS).toHaveProperty("guest");
  });

  // There are exactly 15 permission keys
  test("PERMISSION_KEYS has 15 entries", () => {
    expect(PERMISSION_KEYS).toHaveLength(15);
  });
});
