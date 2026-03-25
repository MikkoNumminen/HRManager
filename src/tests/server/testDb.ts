import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const testPrisma = new PrismaClient({ adapter });

/** Timeout (ms) for Jest hooks that call cleanDb — can be slow under load. */
export const CLEAN_DB_TIMEOUT = 30_000;

export async function cleanDb() {
  // Run all deletes inside an interactive transaction so they share a single
  // DB connection, avoiding deadlocks from Prisma's pool holding idle locks.
  // DO NOT replace with TRUNCATE CASCADE — it requires ACCESS EXCLUSIVE locks
  // that deadlock with the PrismaPg adapter's connection pool.
  await testPrisma.$transaction(
    async (tx) => {
      await tx.userFeatureFlag.deleteMany();
      await tx.featureFlag.deleteMany();
      await tx.twoFactorAuth.deleteMany();
      await tx.userSession.deleteMany();
      await tx.userPermission.deleteMany();
      await tx.demoSession.deleteMany();
      await tx.reviewSubmission.deleteMany();
      await tx.reviewRequest.deleteMany();
      await tx.reviewCycle.deleteMany();
      await tx.reviewTemplate.deleteMany();
      await tx.leaveRequest.deleteMany();
      await tx.leaveBalance.deleteMany();
      await tx.leaveType.deleteMany();
      await tx.teamMember.deleteMany();
      await tx.team.updateMany({ data: { teamManagerId: null } });
      await tx.department.updateMany({ data: { headId: null } });
      await tx.team.deleteMany();
      await tx.department.deleteMany();
      await tx.person.deleteMany();
      await tx.position.deleteMany();
      await tx.user.deleteMany();
      await tx.permission.deleteMany();
      await tx.rateLimit.deleteMany();
    },
    { timeout: CLEAN_DB_TIMEOUT },
  );
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
