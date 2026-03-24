// Mock @/db — provide a testable prisma instance
const mockQueryRaw = jest.fn();
jest.mock("@/db", () => ({
  prisma: { $queryRaw: (...args: unknown[]) => mockQueryRaw(...args) },
}));

// Mock @/mongoDb
const mockIsMongoAvailable = jest.fn();
const mockFindOne = jest.fn();
jest.mock("@/mongoDb", () => ({
  isMongoAvailable: () => mockIsMongoAvailable(),
  getAuditLogCollection: () => ({ findOne: mockFindOne }),
}));

import { GET as healthGET } from "@/app/api/health/route";
import { GET as readyGET } from "@/app/api/ready/route";

describe("/api/health", () => {
  // Returns 200 with status "ok" and basic info.
  test("returns 200 with ok status and version info", async () => {
    const res = await healthGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.version).toBeDefined();
    expect(typeof body.uptime).toBe("number");
    expect(body.timestamp).toBeDefined();
  });
});

describe("/api/ready", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Returns 200 when both Postgres and MongoDB are healthy.
  test("returns 200 ready when all dependencies are healthy", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockIsMongoAvailable.mockReturnValue(true);
    mockFindOne.mockResolvedValue(null);

    const res = await readyGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ready");
    expect(body.dependencies.postgres.status).toBe("ok");
    expect(body.dependencies.mongodb.status).toBe("ok");
    expect(typeof body.totalLatencyMs).toBe("number");
  });

  // Returns 503 when Postgres is down.
  test("returns 503 degraded when Postgres is down", async () => {
    mockQueryRaw.mockRejectedValue(new Error("Connection refused"));
    mockIsMongoAvailable.mockReturnValue(true);
    mockFindOne.mockResolvedValue(null);

    const res = await readyGET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.dependencies.postgres.status).toBe("error");
    expect(body.dependencies.postgres.error).toBe("Connection refused");
  });

  // Returns 503 when MongoDB is down.
  test("returns 503 degraded when MongoDB is down", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockIsMongoAvailable.mockReturnValue(true);
    mockFindOne.mockRejectedValue(new Error("MongoNetworkError"));

    const res = await readyGET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.dependencies.mongodb.status).toBe("error");
  });

  // Returns ok for MongoDB when MONGODB_URL is not configured (optional dependency).
  test("returns ok for MongoDB when not configured", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockIsMongoAvailable.mockReturnValue(false);

    const res = await readyGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ready");
    expect(body.dependencies.mongodb.status).toBe("ok");
    expect(body.dependencies.mongodb.latencyMs).toBe(0);
  });

  // Includes version, uptime, and timestamp in response.
  test("includes version, uptime, and timestamp", async () => {
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockIsMongoAvailable.mockReturnValue(false);

    const res = await readyGET();
    const body = await res.json();
    expect(body.version).toBeDefined();
    expect(typeof body.uptime).toBe("number");
    expect(body.timestamp).toBeDefined();
  });
});
