import { getClientIp, requireAdminIp } from "../lib/ipAllowlist";
import { ActionError } from "../actionErrors";

// Mock next/headers to control what IP headers the server action sees
const mockGet = jest.fn();
jest.mock("next/headers", () => ({
  headers: jest.fn(() => Promise.resolve({ get: mockGet })),
}));

// Mock deferAuditLog so blocked-attempt logging doesn't hit MongoDB
jest.mock("@/auditLog", () => ({
  deferAuditLog: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.ADMIN_IP_ALLOWLIST;
});

describe("getClientIp", () => {
  // Prefers x-vercel-forwarded-for (Vercel platform header, cannot be spoofed)
  test("returns first IP from x-vercel-forwarded-for when present", async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === "x-vercel-forwarded-for") return "1.2.3.4, 9.9.9.9";
      return null;
    });

    const ip = await getClientIp();
    expect(ip).toBe("1.2.3.4");
  });

  // Falls back to x-forwarded-for when Vercel header is absent
  test("falls back to first IP from x-forwarded-for", async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === "x-forwarded-for") return "5.6.7.8, 10.0.0.1";
      return null;
    });

    const ip = await getClientIp();
    expect(ip).toBe("5.6.7.8");
  });

  // Falls back to x-real-ip when neither forwarded header is present
  test("falls back to x-real-ip", async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === "x-real-ip") return "192.168.1.1";
      return null;
    });

    const ip = await getClientIp();
    expect(ip).toBe("192.168.1.1");
  });

  // Returns null when no IP headers are present at all
  test("returns null when no IP headers are present", async () => {
    mockGet.mockReturnValue(null);

    const ip = await getClientIp();
    expect(ip).toBeNull();
  });
});

describe("requireAdminIp", () => {
  // No ADMIN_IP_ALLOWLIST env var set → allow all (opt-in enforcement)
  test("passes when ADMIN_IP_ALLOWLIST is not set", async () => {
    mockGet.mockReturnValue("5.6.7.8");

    await expect(requireAdminIp()).resolves.toBeUndefined();
  });

  // Empty ADMIN_IP_ALLOWLIST → allow all
  test("passes when ADMIN_IP_ALLOWLIST is empty string", async () => {
    process.env.ADMIN_IP_ALLOWLIST = "";
    mockGet.mockReturnValue("5.6.7.8");

    await expect(requireAdminIp()).resolves.toBeUndefined();
  });

  // Allowlist set, client IP matches exactly → allow
  test("passes when client IP is in the allowlist", async () => {
    process.env.ADMIN_IP_ALLOWLIST = "1.2.3.4";
    mockGet.mockImplementation((name: string) => {
      if (name === "x-forwarded-for") return "1.2.3.4";
      return null;
    });

    await expect(requireAdminIp()).resolves.toBeUndefined();
  });

  // Allowlist set, client IP does not match → throw ActionError with ipNotAllowed code
  test("throws ActionError with ipNotAllowed when client IP is not in the allowlist", async () => {
    process.env.ADMIN_IP_ALLOWLIST = "1.2.3.4";
    mockGet.mockImplementation((name: string) => {
      if (name === "x-forwarded-for") return "5.6.7.8";
      return null;
    });

    const error = await requireAdminIp().catch((e) => e);
    expect(error).toBeInstanceOf(ActionError);
    expect((error as ActionError).code).toBe("ipNotAllowed");
    expect(error.message).toBe("Admin access not allowed from this IP address.");
  });

  // Multiple IPs in allowlist — matching second entry passes
  test("passes when client IP matches one of multiple IPs in the allowlist", async () => {
    process.env.ADMIN_IP_ALLOWLIST = "1.2.3.4,10.0.0.5,172.16.0.1";
    mockGet.mockImplementation((name: string) => {
      if (name === "x-forwarded-for") return "10.0.0.5";
      return null;
    });

    await expect(requireAdminIp()).resolves.toBeUndefined();
  });

  // Multiple IPs in allowlist — IP not in list is blocked
  test("throws when client IP is not in a multi-entry allowlist", async () => {
    process.env.ADMIN_IP_ALLOWLIST = "1.2.3.4,10.0.0.5";
    mockGet.mockImplementation((name: string) => {
      if (name === "x-forwarded-for") return "99.99.99.99";
      return null;
    });

    const error = await requireAdminIp().catch((e) => e);
    expect(error).toBeInstanceOf(ActionError);
    expect((error as ActionError).code).toBe("ipNotAllowed");
  });

  // Allowlist with whitespace around IPs is parsed correctly
  test("handles whitespace around IPs in allowlist", async () => {
    process.env.ADMIN_IP_ALLOWLIST = " 1.2.3.4 , 5.6.7.8 ";
    mockGet.mockImplementation((name: string) => {
      if (name === "x-forwarded-for") return "5.6.7.8";
      return null;
    });

    await expect(requireAdminIp()).resolves.toBeUndefined();
  });

  // Unknown client IP (null headers) when allowlist is set → blocked
  test("throws when client IP cannot be determined and allowlist is set", async () => {
    process.env.ADMIN_IP_ALLOWLIST = "1.2.3.4";
    mockGet.mockReturnValue(null);

    const error = await requireAdminIp().catch((e) => e);
    expect(error).toBeInstanceOf(ActionError);
    expect((error as ActionError).code).toBe("ipNotAllowed");
  });
});
