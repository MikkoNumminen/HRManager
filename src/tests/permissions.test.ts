import {
  resolvePermissions,
  ROLE_DEFAULTS,
  PERMISSION_KEYS,
  getCurrentUser,
  getUserPermissions,
  hasPermission,
  requirePermission,
  seedPermissions,
} from "../permissions";

const mockAuth = jest.fn();
jest.mock("../auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

const mockUpsert = jest.fn();
const mockTransaction = jest.fn();
const mockFindUnique = jest.fn();
jest.mock("../db", () => ({
  prisma: {
    user: {
      get findUnique() {
        return mockFindUnique;
      },
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

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
    expect(result["department:create"]).toBe(true);
    expect(result["department:delete"]).toBe(true);
    expect(result["department:update"]).toBe(true);
    expect(result["department:assign_team"]).toBe(true);
    expect(result["department:read"]).toBe(true);
    expect(result["data:reset"]).toBe(false);
    expect(result["admin:manage_users"]).toBe(false);
  });

  // Regular user can only read by default
  test("user gets read-only permissions by default", async () => {
    const result = await resolvePermissions("user", []);

    expect(result["person:read"]).toBe(true);
    expect(result["team:read"]).toBe(true);
    expect(result["department:read"]).toBe(true);
    expect(result["person:create"]).toBe(false);
    expect(result["team:create"]).toBe(false);
    expect(result["department:create"]).toBe(false);
    expect(result["admin:manage_users"]).toBe(false);
  });

  // Guest gets the same read-only permissions as user
  test("guest gets read-only permissions", async () => {
    const result = await resolvePermissions("guest", []);

    expect(result["person:read"]).toBe(true);
    expect(result["team:read"]).toBe(true);
    expect(result["department:read"]).toBe(true);
    expect(result["person:create"]).toBe(false);
    expect(result["department:create"]).toBe(false);
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

  // There are exactly 21 permission keys (16 original + 5 department)
  test("PERMISSION_KEYS has 21 entries", () => {
    expect(PERMISSION_KEYS).toHaveLength(21);
  });
});

describe("getCurrentUser", () => {
  // If there's no session (not logged in), return null.
  test("returns null when no session exists", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  // If the session has no email, return null.
  test("returns null when session has no email", async () => {
    mockAuth.mockResolvedValue({ user: { name: "Alice" } });
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  // If the user exists in the DB, return their record with permissions included.
  test("returns user from database when session has email", async () => {
    mockAuth.mockResolvedValue({ user: { email: "alice@test.com" } });
    const mockUser = {
      id: "123",
      email: "alice@test.com",
      role: "user",
      permissions: [],
    };
    mockFindUnique.mockResolvedValue(mockUser);

    const result = await getCurrentUser();
    expect(result).toEqual(mockUser);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "alice@test.com" },
      include: { permissions: { include: { permission: true } } },
    });
  });

  // If the user has an email in session but isn't in the DB, return null.
  test("returns null when user not found in database", async () => {
    mockAuth.mockResolvedValue({ user: { email: "ghost@test.com" } });
    mockFindUnique.mockResolvedValue(null);

    const result = await getCurrentUser();
    expect(result).toBeNull();
  });
});

describe("getUserPermissions", () => {
  // When given a userId, look up that user directly in the DB.
  test("resolves permissions for a specific userId", async () => {
    mockFindUnique.mockResolvedValue({
      id: "123",
      role: "administrator",
      permissions: [{ permission: { key: "data:reset" }, granted: true }],
    });

    const result = await getUserPermissions("123");
    expect(result["person:create"]).toBe(true);
    expect(result["data:reset"]).toBe(true);
  });

  // When the userId doesn't match anyone, fall back to guest permissions.
  test("returns guest permissions when userId not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await getUserPermissions("nonexistent");
    expect(result["person:read"]).toBe(true);
    expect(result["person:create"]).toBe(false);
  });

  // When no userId is given, use the current session user.
  test("resolves permissions for current session user when no userId", async () => {
    mockAuth.mockResolvedValue({ user: { email: "alice@test.com" } });
    mockFindUnique.mockResolvedValue({
      id: "123",
      role: "user",
      permissions: [{ permission: { key: "person:create" }, granted: true }],
    });

    const result = await getUserPermissions();
    expect(result["person:create"]).toBe(true);
    expect(result["person:read"]).toBe(true);
    expect(result["team:create"]).toBe(false);
  });

  // When no userId and no session, fall back to guest permissions.
  test("returns guest permissions when not logged in and no userId", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getUserPermissions();
    expect(result["person:read"]).toBe(true);
    expect(result["person:create"]).toBe(false);
  });
});

describe("hasPermission", () => {
  // Returns true when the current user has the requested permission.
  test("returns true when permission is allowed", async () => {
    mockAuth.mockResolvedValue({ user: { email: "alice@test.com" } });
    mockFindUnique.mockResolvedValue({
      id: "123",
      role: "administrator",
      permissions: [],
    });

    const result = await hasPermission("person:create");
    expect(result).toBe(true);
  });

  // Returns false when the current user lacks the requested permission.
  test("returns false when permission is denied", async () => {
    mockAuth.mockResolvedValue({ user: { email: "alice@test.com" } });
    mockFindUnique.mockResolvedValue({
      id: "123",
      role: "user",
      permissions: [],
    });

    const result = await hasPermission("person:create");
    expect(result).toBe(false);
  });

  // Returns false for a completely unknown permission key.
  test("returns false for unknown permission key", async () => {
    mockAuth.mockResolvedValue({ user: { email: "alice@test.com" } });
    mockFindUnique.mockResolvedValue({
      id: "123",
      role: "administrator",
      permissions: [],
    });

    const result = await hasPermission("fake:permission");
    expect(result).toBe(false);
  });
});

describe("requirePermission", () => {
  // Does not throw when the user has the requested permission.
  test("does not throw when permission is allowed", async () => {
    mockAuth.mockResolvedValue({ user: { email: "alice@test.com" } });
    mockFindUnique.mockResolvedValue({
      id: "123",
      role: "administrator",
      permissions: [],
    });

    await expect(requirePermission("person:create")).resolves.not.toThrow();
  });

  // Throws "Permission denied" when the user lacks the requested permission.
  test("throws when permission is denied", async () => {
    mockAuth.mockResolvedValue({ user: { email: "alice@test.com" } });
    mockFindUnique.mockResolvedValue({
      id: "123",
      role: "user",
      permissions: [],
    });

    await expect(requirePermission("person:create")).rejects.toThrow(
      "Permission denied: person:create",
    );
  });

  // Throws when there's no session at all (guest).
  test("throws for unauthenticated user", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requirePermission("person:create")).rejects.toThrow("Permission denied");
  });
});

describe("seedPermissions", () => {
  // Calls upsert for every permission key inside a transaction.
  test("upserts all 21 permission keys inside a transaction", async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ permission: { upsert: mockUpsert } });
    });
    mockUpsert.mockResolvedValue({});

    await seedPermissions();

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledTimes(PERMISSION_KEYS.length);
  });

  // Each upsert call uses the correct permission key and a human-readable description.
  test("passes correct key and description to each upsert", async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ permission: { upsert: mockUpsert } });
    });
    mockUpsert.mockResolvedValue({});

    await seedPermissions();

    // Verify a few representative keys have correct descriptions
    const calls = mockUpsert.mock.calls;
    const createCall = calls.find(
      (c: unknown[]) => (c[0] as { where: { key: string } }).where.key === "person:create",
    );
    expect(createCall).toBeDefined();
    expect((createCall![0] as { create: { description: string } }).create.description).toBe(
      "Create new persons",
    );

    const auditCall = calls.find(
      (c: unknown[]) => (c[0] as { where: { key: string } }).where.key === "admin:view_audit_log",
    );
    expect(auditCall).toBeDefined();
    expect((auditCall![0] as { create: { description: string } }).create.description).toBe(
      "View audit log history",
    );
  });

  // Each upsert has an empty update object (no-op on existing records).
  test("uses empty update object for existing records", async () => {
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ permission: { upsert: mockUpsert } });
    });
    mockUpsert.mockResolvedValue({});

    await seedPermissions();

    for (const call of mockUpsert.mock.calls) {
      expect((call[0] as { update: object }).update).toEqual({});
    }
  });
});
