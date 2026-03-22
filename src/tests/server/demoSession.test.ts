import { testPrisma, cleanDb } from "./testDb";

// Mock auth to return null (non-demo user) by default
jest.mock("../../auth", () => ({
  auth: jest.fn(() => Promise.resolve(null)),
}));

// Import after mocking so getDemoSessionId uses the mocked auth
const { seedDemoData, cleanupStaleDemoSessions, getDemoSessionId } =
  require("../../demoSession") as typeof import("../../demoSession");
const { auth } = require("../../auth") as { auth: jest.Mock };

describe("demoSession", () => {
  beforeEach(() => cleanDb());
  afterAll(async () => {
    await cleanDb();
    await testPrisma.$disconnect();
  });

  describe("getDemoSessionId", () => {
    // Returns null when there is no session (unauthenticated).
    test("returns null when no session", async () => {
      auth.mockResolvedValue(null);
      const result = await getDemoSessionId();
      expect(result).toBeNull();
    });

    // Returns null for a real OAuth user who has no demoSessionId.
    test("returns null for non-demo user", async () => {
      auth.mockResolvedValue({ user: { id: "u1", email: "real@user.com" } });
      const result = await getDemoSessionId();
      expect(result).toBeNull();
    });

    // Returns the demoSessionId for a demo user.
    test("returns demoSessionId for demo user", async () => {
      auth.mockResolvedValue({
        user: { id: "u1", email: "demo@hrmanager.app", demoSessionId: "sess-123" },
      });
      const result = await getDemoSessionId();
      expect(result).toBe("sess-123");
    });
  });

  describe("seedDemoData", () => {
    // Creates the expected number of entities scoped to the given sessionId.
    test("seeds 9 persons, 5 teams, 10 memberships, 4 departments", async () => {
      const sessionId = "test-session-1";
      await seedDemoData(sessionId);

      const persons = await testPrisma.person.findMany({ where: { sessionId } });
      expect(persons).toHaveLength(9);

      const teams = await testPrisma.team.findMany({ where: { sessionId } });
      expect(teams).toHaveLength(5);

      const members = await testPrisma.teamMember.findMany({ where: { sessionId } });
      expect(members).toHaveLength(10);

      const departments = await testPrisma.department.findMany({ where: { sessionId } });
      expect(departments).toHaveLength(4);
    });

    // All seeded records have the correct sessionId set.
    test("all records have the correct sessionId", async () => {
      const sessionId = "test-session-2";
      await seedDemoData(sessionId);

      const persons = await testPrisma.person.findMany({ where: { sessionId } });
      expect(persons.every((p) => p.sessionId === sessionId)).toBe(true);

      const teams = await testPrisma.team.findMany({ where: { sessionId } });
      expect(teams.every((t) => t.sessionId === sessionId)).toBe(true);

      const members = await testPrisma.teamMember.findMany({ where: { sessionId } });
      expect(members.every((m) => m.sessionId === sessionId)).toBe(true);

      const departments = await testPrisma.department.findMany({ where: { sessionId } });
      expect(departments.every((d) => d.sessionId === sessionId)).toBe(true);
    });

    // Two different sessions create completely isolated data sets.
    test("two sessions have isolated data", async () => {
      await seedDemoData("session-a");
      await seedDemoData("session-b");

      const personsA = await testPrisma.person.findMany({ where: { sessionId: "session-a" } });
      const personsB = await testPrisma.person.findMany({ where: { sessionId: "session-b" } });

      expect(personsA).toHaveLength(9);
      expect(personsB).toHaveLength(9);

      // No overlap in IDs
      const idsA = new Set(personsA.map((p) => p.id));
      const idsB = new Set(personsB.map((p) => p.id));
      for (const id of idsA) {
        expect(idsB.has(id)).toBe(false);
      }
    });

    // Teams have the correct managers assigned.
    test("assigns team managers correctly", async () => {
      const sessionId = "test-managers";
      await seedDemoData(sessionId);

      const engineering = await testPrisma.team.findFirst({
        where: { teamName: "Engineering", sessionId },
        include: { manager: true },
      });
      expect(engineering!.manager!.name).toBe("Alice Johnson");

      const platform = await testPrisma.team.findFirst({
        where: { teamName: "Platform", sessionId },
        include: { manager: true },
      });
      expect(platform!.manager!.name).toBe("Grace Park");
    });

    // Departments have teams assigned correctly.
    test("assigns teams to departments", async () => {
      const sessionId = "test-dept-teams";
      await seedDemoData(sessionId);

      const engDept = await testPrisma.department.findFirst({
        where: { name: "Engineering", sessionId },
        include: { teams: true },
      });
      expect(engDept!.teams).toHaveLength(2);
      expect(engDept!.teams.map((t) => t.teamName).sort()).toEqual(["Engineering", "Platform"]);
    });
  });

  describe("cleanupStaleDemoSessions", () => {
    // Does nothing when there are no stale sessions.
    test("returns 0 when no stale sessions exist", async () => {
      const result = await cleanupStaleDemoSessions();
      expect(result).toBe(0);
    });

    // Removes sessions and their data that are older than 24 hours.
    test("removes stale sessions and their data", async () => {
      const user = await testPrisma.user.create({
        data: { email: "demo@hrmanager.app", name: "Demo User", role: "superuser" },
      });

      // Create a stale session (25 hours old)
      const staleSession = await testPrisma.demoSession.create({
        data: {
          userId: user.id,
          lastActiveAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        },
      });

      // Seed data for the stale session
      await seedDemoData(staleSession.id);

      // Verify data exists
      expect(await testPrisma.person.count({ where: { sessionId: staleSession.id } })).toBe(9);

      const cleaned = await cleanupStaleDemoSessions();
      expect(cleaned).toBe(1);

      // All session data should be gone
      expect(await testPrisma.person.count({ where: { sessionId: staleSession.id } })).toBe(0);
      expect(await testPrisma.team.count({ where: { sessionId: staleSession.id } })).toBe(0);
      expect(await testPrisma.department.count({ where: { sessionId: staleSession.id } })).toBe(0);
      expect(await testPrisma.teamMember.count({ where: { sessionId: staleSession.id } })).toBe(0);
      expect(await testPrisma.demoSession.count({ where: { id: staleSession.id } })).toBe(0);
    });

    // Preserves active sessions that are within the 24-hour window.
    test("preserves active sessions", async () => {
      const user = await testPrisma.user.create({
        data: { email: "demo@hrmanager.app", name: "Demo User", role: "superuser" },
      });

      // Create an active session (1 hour old)
      const activeSession = await testPrisma.demoSession.create({
        data: {
          userId: user.id,
          lastActiveAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
      });

      await seedDemoData(activeSession.id);

      const cleaned = await cleanupStaleDemoSessions();
      expect(cleaned).toBe(0);

      // Data should still exist
      expect(await testPrisma.person.count({ where: { sessionId: activeSession.id } })).toBe(9);
    });

    // Cleans up stale sessions while preserving active ones.
    test("cleans stale sessions while keeping active ones", async () => {
      const user = await testPrisma.user.create({
        data: { email: "demo@hrmanager.app", name: "Demo User", role: "superuser" },
      });

      const staleSession = await testPrisma.demoSession.create({
        data: {
          userId: user.id,
          lastActiveAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        },
      });
      const activeSession = await testPrisma.demoSession.create({
        data: {
          userId: user.id,
          lastActiveAt: new Date(),
        },
      });

      await seedDemoData(staleSession.id);
      await seedDemoData(activeSession.id);

      const cleaned = await cleanupStaleDemoSessions();
      expect(cleaned).toBe(1);

      // Stale data gone
      expect(await testPrisma.person.count({ where: { sessionId: staleSession.id } })).toBe(0);
      // Active data preserved
      expect(await testPrisma.person.count({ where: { sessionId: activeSession.id } })).toBe(9);
    });
  });
});
