// Mock @/db to intercept raw queries
jest.mock("@/db", () => {
  const mockFn = jest.fn();
  return {
    prisma: { $queryRaw: mockFn },
    __mockQueryRaw: mockFn,
  };
});

// Mock next-auth — ESM imports that Jest can't parse in CJS mode
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock next/cache — unstable_cache is not available in test environment
jest.mock("next/cache", () => ({
  unstable_cache: jest.fn(),
}));

// Mock permissions — hasPermission controls access to report queries
const mockHasPermission = jest.fn();
jest.mock("@/permissions", () => {
  const actual = jest.requireActual("@/permissions");
  return {
    ...actual,
    hasPermission: (...args: unknown[]) => mockHasPermission(...args),
    getUserPermissions: jest.fn(() =>
      Object.fromEntries(actual.PERMISSION_KEYS.map((k: string) => [k, true])),
    ),
  };
});

// Mock demo session — defaults to null (production mode)
const mockGetDemoSessionId = jest.fn().mockResolvedValue(null);
jest.mock("@/demoSession", () => ({
  getDemoSessionId: () => mockGetDemoSessionId(),
}));

import {
  getHeadcountTrends,
  getTurnoverRates,
  getLeaveUtilization,
  getReviewCompletionRates,
  exportReportCsv,
} from "@/features/reports/queries";

const { __mockQueryRaw: mockQueryRaw } = require("@/db") as { __mockQueryRaw: jest.Mock };

beforeEach(() => {
  jest.clearAllMocks();
  mockHasPermission.mockResolvedValue(true);
  mockGetDemoSessionId.mockResolvedValue(null);
});

describe("getHeadcountTrends", () => {
  // Returns parsed headcount trend data from raw SQL results
  test("returns headcount trends from raw query results", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        month: "2026-01",
        departmentName: "Engineering",
        hired: 5,
        departed: 1,
        runningHeadcount: 4,
      },
      {
        month: "2026-02",
        departmentName: "Engineering",
        hired: 3,
        departed: 0,
        runningHeadcount: 7,
      },
    ]);

    const result = await getHeadcountTrends();
    expect(result).toHaveLength(2);
    expect(result[0].month).toBe("2026-01");
    expect(result[0].departmentName).toBe("Engineering");
    expect(result[0].hired).toBe(5);
    expect(result[0].departed).toBe(1);
    expect(result[0].runningHeadcount).toBe(4);
    expect(result[1].runningHeadcount).toBe(7);
  });

  // Returns empty array when no data exists
  test("returns empty array when no data", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    const result = await getHeadcountTrends();
    expect(result).toEqual([]);
  });

  // Throws when user lacks reports:view permission
  test("throws on permission denial", async () => {
    mockHasPermission.mockResolvedValue(false);
    await expect(getHeadcountTrends()).rejects.toThrow("Permission denied");
  });

  // Scopes query to demo session
  test("uses demo session ID when available", async () => {
    mockGetDemoSessionId.mockResolvedValue("demo-session-123");
    mockQueryRaw.mockResolvedValueOnce([]);
    await getHeadcountTrends();
    expect(mockGetDemoSessionId).toHaveBeenCalled();
  });

  // Passes filters through to query
  test("accepts department and date range filters", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    await getHeadcountTrends({
      departmentId: "dept-uuid-1",
      dateFrom: new Date("2026-01-01"),
      dateTo: new Date("2026-06-30"),
    });
    expect(mockQueryRaw).toHaveBeenCalled();
  });
});

describe("getTurnoverRates", () => {
  // Returns parsed turnover data from raw SQL
  test("returns turnover rates with percentage", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        month: "2026-01",
        departmentName: "Marketing",
        startCount: 10,
        departedCount: 2,
        turnoverPct: 20.0,
      },
    ]);

    const result = await getTurnoverRates();
    expect(result).toHaveLength(1);
    expect(result[0].turnoverPct).toBe(20.0);
    expect(result[0].startCount).toBe(10);
    expect(result[0].departedCount).toBe(2);
  });

  // Throws when user lacks reports:view permission
  test("throws on permission denial", async () => {
    mockHasPermission.mockResolvedValue(false);
    await expect(getTurnoverRates()).rejects.toThrow("Permission denied");
  });

  // Handles null values by defaulting to 0
  test("handles null values gracefully", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        month: "2026-03",
        departmentName: "Sales",
        startCount: null,
        departedCount: null,
        turnoverPct: null,
      },
    ]);

    const result = await getTurnoverRates();
    expect(result[0].startCount).toBe(0);
    expect(result[0].departedCount).toBe(0);
    expect(result[0].turnoverPct).toBe(0);
  });
});

describe("getLeaveUtilization", () => {
  // Returns leave utilization data grouped by department and type
  test("returns leave utilization by department and type", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        departmentName: "Engineering",
        leaveTypeName: "Annual",
        leaveTypeColor: "#1976d2",
        totalAllocated: 100,
        totalUsed: 60,
        totalRemaining: 40,
        utilizationPct: 60.0,
      },
    ]);

    const result = await getLeaveUtilization();
    expect(result).toHaveLength(1);
    expect(result[0].departmentName).toBe("Engineering");
    expect(result[0].leaveTypeName).toBe("Annual");
    expect(result[0].totalAllocated).toBe(100);
    expect(result[0].utilizationPct).toBe(60.0);
  });

  // Uses current year when no year filter is specified
  test("defaults to current year", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    await getLeaveUtilization();
    expect(mockQueryRaw).toHaveBeenCalled();
  });

  // Accepts year filter
  test("accepts year filter", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    await getLeaveUtilization({ year: 2025 });
    expect(mockQueryRaw).toHaveBeenCalled();
  });

  // Throws when user lacks reports:view permission
  test("throws on permission denial", async () => {
    mockHasPermission.mockResolvedValue(false);
    await expect(getLeaveUtilization()).rejects.toThrow("Permission denied");
  });
});

describe("getReviewCompletionRates", () => {
  // Returns review completion rates per cycle
  test("returns completion rates per review cycle", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        cycleName: "Q1 2026 Review",
        cycleStatus: "CLOSED",
        totalRequests: 20,
        submittedCount: 18,
        completionPct: 90.0,
      },
      {
        cycleName: "Q2 2026 Review",
        cycleStatus: "OPEN",
        totalRequests: 15,
        submittedCount: 5,
        completionPct: 33.3,
      },
    ]);

    const result = await getReviewCompletionRates();
    expect(result).toHaveLength(2);
    expect(result[0].cycleName).toBe("Q1 2026 Review");
    expect(result[0].completionPct).toBe(90.0);
    expect(result[1].cycleStatus).toBe("OPEN");
  });

  // Throws when user lacks reports:view permission
  test("throws on permission denial", async () => {
    mockHasPermission.mockResolvedValue(false);
    await expect(getReviewCompletionRates()).rejects.toThrow("Permission denied");
  });

  // Returns empty array when no review cycles exist
  test("returns empty when no cycles exist", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    const result = await getReviewCompletionRates();
    expect(result).toEqual([]);
  });
});

describe("exportReportCsv", () => {
  // Exports headcount data as CSV string with headers
  test("exports headcount as CSV", async () => {
    // exportReportCsv calls hasPermission for reports:export, then internally calls
    // getHeadcountTrends which calls hasPermission for reports:view
    mockHasPermission.mockResolvedValue(true);
    mockQueryRaw.mockResolvedValueOnce([
      {
        month: "2026-01",
        departmentName: "Engineering",
        hired: 5,
        departed: 1,
        runningHeadcount: 4,
      },
    ]);

    const csv = await exportReportCsv("headcount");
    expect(csv).toContain("Month,Department,Hired,Departed,Running Headcount");
    expect(csv).toContain("2026-01,Engineering,5,1,4");
  });

  // Exports turnover data as CSV string
  test("exports turnover as CSV", async () => {
    mockHasPermission.mockResolvedValue(true);
    mockQueryRaw.mockResolvedValueOnce([
      {
        month: "2026-01",
        departmentName: "Marketing",
        startCount: 10,
        departedCount: 2,
        turnoverPct: 20.0,
      },
    ]);

    const csv = await exportReportCsv("turnover");
    expect(csv).toContain("Month,Department,Start Count,Departed,Turnover %");
    expect(csv).toContain("2026-01,Marketing,10,2,20");
  });

  // Exports leave utilization as CSV string
  test("exports leave as CSV", async () => {
    mockHasPermission.mockResolvedValue(true);
    mockQueryRaw.mockResolvedValueOnce([
      {
        departmentName: "Engineering",
        leaveTypeName: "Annual",
        leaveTypeColor: "#1976d2",
        totalAllocated: 100,
        totalUsed: 60,
        totalRemaining: 40,
        utilizationPct: 60.0,
      },
    ]);

    const csv = await exportReportCsv("leave");
    expect(csv).toContain("Department,Leave Type,Allocated,Used,Remaining,Utilization %");
    expect(csv).toContain("Engineering,Annual,100,60,40,60");
  });

  // Exports review completion as CSV string
  test("exports reviews as CSV", async () => {
    mockHasPermission.mockResolvedValue(true);
    mockQueryRaw.mockResolvedValueOnce([
      {
        cycleName: "Q1 Review",
        cycleStatus: "CLOSED",
        totalRequests: 20,
        submittedCount: 18,
        completionPct: 90.0,
      },
    ]);

    const csv = await exportReportCsv("reviews");
    expect(csv).toContain("Cycle,Status,Total Requests,Submitted,Completion %");
    expect(csv).toContain("Q1 Review,CLOSED,20,18,90");
  });

  // Throws when user lacks reports:export permission
  test("throws on export permission denial", async () => {
    mockHasPermission.mockResolvedValue(false);
    await expect(exportReportCsv("headcount")).rejects.toThrow("Permission denied");
  });

  // Handles CSV values containing commas by quoting them
  test("escapes CSV values with commas", async () => {
    mockHasPermission.mockResolvedValue(true);
    mockQueryRaw.mockResolvedValueOnce([
      {
        month: "2026-01",
        departmentName: "Sales, Marketing",
        hired: 3,
        departed: 0,
        runningHeadcount: 3,
      },
    ]);

    const csv = await exportReportCsv("headcount");
    expect(csv).toContain('"Sales, Marketing"');
  });
});
