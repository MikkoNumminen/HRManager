import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Default pool for Prisma — needs multiple connections for interactive transactions.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

// Dedicated single-connection pool for TRUNCATE — bypasses Prisma's pool entirely
// so ACCESS EXCLUSIVE lock never contends with idle Prisma pool connections.
const cleanPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 1,
});

export const testPrisma = new PrismaClient({ adapter });

/** Timeout (ms) for Jest hooks that call cleanDb — can be slow under load. */
export const CLEAN_DB_TIMEOUT = 30_000;

export async function cleanDb() {
  // First disconnect Prisma to release all pool connections and their locks,
  // then TRUNCATE via dedicated pool. Prisma reconnects lazily on next query.
  await testPrisma.$disconnect();
  const client = await cleanPool.connect();
  try {
    await client.query(`
      TRUNCATE TABLE
        "UserFeatureFlag",
        "FeatureFlag",
        "TwoFactorAuth",
        "UserSession",
        "UserPermission",
        "DemoSession",
        "ReviewSubmission",
        "ReviewRequest",
        "ReviewCycle",
        "ReviewTemplate",
        "LeaveRequest",
        "LeaveBalance",
        "LeaveType",
        "TeamMember",
        "Team",
        "Department",
        "Person",
        "Position",
        "User",
        "Permission",
        "RateLimit"
      CASCADE
    `);
  } finally {
    client.release();
  }
}

// Factory: create a test person with optional overrides
export async function createTestPerson(
  overrides: Partial<{
    name: string;
    email: string;
    position: string;
    sessionId: string;
  }> = {},
) {
  return testPrisma.person.create({
    data: {
      name: overrides.name ?? `Test Person ${Date.now()}`,
      email: overrides.email ?? null,
      position: overrides.position ?? null,
      sessionId: overrides.sessionId ?? null,
    },
  });
}

// Factory: create a test team with optional overrides
export async function createTestTeam(
  overrides: Partial<{
    teamName: string;
    teamManagerId: string;
    departmentId: string;
    sessionId: string;
  }> = {},
) {
  return testPrisma.team.create({
    data: {
      teamName: overrides.teamName ?? `Test Team ${Date.now()}`,
      teamManagerId: overrides.teamManagerId ?? null,
      departmentId: overrides.departmentId ?? null,
      sessionId: overrides.sessionId ?? null,
    },
  });
}

// Factory: create a test department with optional overrides
export async function createTestDepartment(
  overrides: Partial<{
    name: string;
    description: string;
    headId: string;
    sessionId: string;
  }> = {},
) {
  return testPrisma.department.create({
    data: {
      name: overrides.name ?? `Test Department ${Date.now()}`,
      description: overrides.description ?? null,
      headId: overrides.headId ?? null,
      sessionId: overrides.sessionId ?? null,
    },
  });
}
