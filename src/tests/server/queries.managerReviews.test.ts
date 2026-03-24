import { testPrisma, cleanDb } from "./testDb";

// Mock @/db to use the test database
jest.mock("@/db", () => ({
  prisma: require("./testDb").testPrisma,
}));

// Mock @/mongoDb — required because @/queries imports it at module level.
jest.mock("@/mongoDb", () => ({
  getAuditLogCollection: jest.fn(),
  isMongoAvailable: () => false,
}));

// Mock next-auth — it uses ESM imports that Jest can't parse in CJS mode.
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

// Mock permissions — hasPermission controls access to getManagerTeamReviews.
// Default to true so tests focus on data logic; permission-denial test overrides below.
jest.mock("@/permissions", () => ({
  ...jest.requireActual("@/permissions"),
  hasPermission: jest.fn(() => true),
}));

// Mock demo session — defaults to null (production mode).
const mockGetDemoSessionId = jest.fn().mockResolvedValue(null);
jest.mock("@/demoSession", () => ({
  getDemoSessionId: () => mockGetDemoSessionId(),
}));

import { getManagerTeamReviews } from "@/features/reviews/queries";

describe("getManagerTeamReviews", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(() => cleanDb());

  // When the manager has no teams, there are no direct reports and the function
  // should return an empty array without touching the ReviewRequest table.
  test("returns empty array when person manages no teams", async () => {
    const manager = await testPrisma.person.create({
      data: { name: "Alice Manager" },
    });

    const result = await getManagerTeamReviews(manager.id);
    expect(result).toEqual([]);
  });

  // A manager may own teams that have zero members yet. In that case there are
  // still no direct-report IDs, so the result must be empty.
  test("returns empty array when managed teams have no members", async () => {
    const manager = await testPrisma.person.create({
      data: { name: "Bob Manager" },
    });
    await testPrisma.team.create({
      data: { teamName: "Empty Team", teamManagerId: manager.id },
    });

    const result = await getManagerTeamReviews(manager.id);
    expect(result).toEqual([]);
  });

  // The core happy-path: when direct reports have review requests, the function
  // groups them by cycle and then by subject within each cycle.
  test("returns review requests grouped by cycle and subject for direct reports", async () => {
    const manager = await testPrisma.person.create({
      data: { name: "Carol Manager" },
    });
    const report = await testPrisma.person.create({
      data: { name: "Dave Report" },
    });
    const reviewer = await testPrisma.person.create({
      data: { name: "Eve Reviewer" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Alpha Team", teamManagerId: manager.id },
    });
    await testPrisma.teamMember.create({
      data: { personId: report.id, teamId: team.teamId },
    });

    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Q1 2026",
        status: "OPEN",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-03-31"),
      },
    });
    await testPrisma.reviewRequest.create({
      data: {
        cycleId: cycle.id,
        subjectId: report.id,
        reviewerId: reviewer.id,
        type: "PEER",
        status: "PENDING",
      },
    });

    const result = await getManagerTeamReviews(manager.id);

    expect(result).toHaveLength(1);
    expect(result[0].cycleId).toBe(cycle.id);
    expect(result[0].cycleName).toBe("Q1 2026");
    expect(result[0].cycleStatus).toBe("OPEN");
    expect(result[0].reports).toHaveLength(1);
    expect(result[0].reports[0].subjectId).toBe(report.id);
    expect(result[0].reports[0].subjectName).toBe("Dave Report");
    expect(result[0].reports[0].requests).toHaveLength(1);
    expect(result[0].reports[0].requests[0].type).toBe("PEER");
    expect(result[0].reports[0].requests[0].status).toBe("PENDING");
    expect(result[0].reports[0].requests[0].reviewerName).toBe("Eve Reviewer");
  });

  // Only persons who are members of the manager's teams should appear.
  // Review requests for other subjects must be excluded from the result.
  test("does not include review requests for subjects who are not direct reports", async () => {
    const manager = await testPrisma.person.create({
      data: { name: "Frank Manager" },
    });
    const directReport = await testPrisma.person.create({
      data: { name: "Grace Report" },
    });
    const outsider = await testPrisma.person.create({
      data: { name: "Hank Outsider" },
    });
    const team = await testPrisma.team.create({
      data: { teamName: "Beta Team", teamManagerId: manager.id },
    });
    await testPrisma.teamMember.create({
      data: { personId: directReport.id, teamId: team.teamId },
    });

    const cycle = await testPrisma.reviewCycle.create({
      data: {
        name: "Q2 2026",
        status: "OPEN",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-06-30"),
      },
    });
    // Review for direct report — should appear
    await testPrisma.reviewRequest.create({
      data: {
        cycleId: cycle.id,
        subjectId: directReport.id,
        type: "SELF",
        status: "PENDING",
      },
    });
    // Review for outsider — must NOT appear
    await testPrisma.reviewRequest.create({
      data: {
        cycleId: cycle.id,
        subjectId: outsider.id,
        type: "SELF",
        status: "PENDING",
      },
    });

    const result = await getManagerTeamReviews(manager.id);

    expect(result).toHaveLength(1);
    expect(result[0].reports).toHaveLength(1);
    expect(result[0].reports[0].subjectId).toBe(directReport.id);
    const subjectIds = result[0].reports.map((r) => r.subjectId);
    expect(subjectIds).not.toContain(outsider.id);
  });

  // Access to team review data is guarded by the review:view permission.
  // Callers without it should receive a hard error, not an empty array.
  test("throws Permission denied when hasPermission returns false", async () => {
    const { hasPermission } = require("@/permissions");
    hasPermission.mockResolvedValueOnce(false);

    const manager = await testPrisma.person.create({
      data: { name: "Ivan Manager" },
    });

    await expect(getManagerTeamReviews(manager.id)).rejects.toThrow("Permission denied");
  });
});

afterAll(() => testPrisma.$disconnect());
