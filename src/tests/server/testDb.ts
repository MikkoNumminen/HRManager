import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const testPrisma = new PrismaClient({ adapter });

export async function cleanDb() {
  await testPrisma.$executeRawUnsafe(`
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
