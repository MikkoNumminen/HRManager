import { auth } from "@/auth";
import { prisma } from "@/db";
import { getAuditLogCollection, isMongoAvailable } from "@/mongoDb";
import { clearSessionEvents } from "@/lib/eventBus";
import {
  PERSON_SEEDS,
  TEAM_SEEDS,
  MEMBERSHIP_SEEDS,
  DEPARTMENT_SEEDS,
  LEAVE_TYPE_SEEDS,
} from "@/seeds";

/**
 * Returns the demo session ID from the current JWT, or null for real users.
 * Used by queries and server actions to scope data to the current demo session.
 */
export async function getDemoSessionId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.demoSessionId ?? null;
}

/**
 * Seeds demo data for a new demo session. Called from the authorize() callback
 * before the JWT is formed, so it takes sessionId directly rather than reading
 * from the session.
 */
export async function seedDemoData(sessionId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const persons = await tx.person.createManyAndReturn({
      data: PERSON_SEEDS.map((p) => ({ ...p, sessionId })),
    });

    const teams = await tx.team.createManyAndReturn({
      data: TEAM_SEEDS.map((t) => ({
        teamName: t.teamName,
        teamManagerId: persons[t.managerIndex].id,
        sessionId,
      })),
    });

    await tx.teamMember.createMany({
      data: MEMBERSHIP_SEEDS.map((m) => ({
        personId: persons[m.personIndex].id,
        teamId: teams[m.teamIndex].teamId,
        sessionId,
      })),
    });

    for (const d of DEPARTMENT_SEEDS) {
      const dept = await tx.department.create({
        data: {
          name: d.name,
          description: d.description,
          headId: persons[d.headIndex].id,
          sessionId,
        },
      });
      for (const teamName of d.teamNames) {
        await tx.team.updateMany({
          where: { teamName, departmentId: null, sessionId },
          data: { departmentId: dept.id },
        });
      }
    }

    // Position catalog — the distinct job titles of the seeded people, so the
    // Positions page isn't empty in the demo.
    const positionNames = [...new Set(PERSON_SEEDS.map((p) => p.position))];
    await tx.position.createMany({
      data: positionNames.map((name) => ({ name, sessionId })),
    });

    // Leave types + a balance per person per type for the current year, plus a
    // couple of sample requests, so the Leave pages are populated in the demo.
    const leaveTypes = await tx.leaveType.createManyAndReturn({
      data: LEAVE_TYPE_SEEDS.map((lt) => ({ ...lt, sessionId })),
    });
    const currentYear = new Date().getFullYear();
    await tx.leaveBalance.createMany({
      data: persons.flatMap((p) =>
        leaveTypes.map((lt) => ({
          personId: p.id,
          leaveTypeId: lt.id,
          year: currentYear,
          allocated: lt.defaultDays,
          used: 0,
          sessionId,
        })),
      ),
    });

    const annualLeave = leaveTypes.find((lt) => lt.name === "Annual Leave");
    const sickLeave = leaveTypes.find((lt) => lt.name === "Sick Leave");
    if (annualLeave && sickLeave) {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 86400000);
      const nextNextWeek = new Date(today.getTime() + 14 * 86400000);

      // Alice (index 0): approved annual leave, reviewed by Frank (index 5).
      await tx.leaveRequest.create({
        data: {
          personId: persons[0].id,
          leaveTypeId: annualLeave.id,
          startDate: nextWeek,
          endDate: new Date(nextWeek.getTime() + 4 * 86400000),
          days: 5,
          note: "Family vacation",
          status: "APPROVED",
          reviewerId: persons[5].id,
          reviewedAt: today,
          sessionId,
        },
      });
      // Bob (index 1): pending sick leave.
      await tx.leaveRequest.create({
        data: {
          personId: persons[1].id,
          leaveTypeId: sickLeave.id,
          startDate: nextNextWeek,
          endDate: new Date(nextNextWeek.getTime() + 1 * 86400000),
          days: 2,
          note: "Medical appointment",
          status: "PENDING",
          sessionId,
        },
      });
      // Reflect Alice's approved leave in her annual balance.
      await tx.leaveBalance.updateMany({
        where: {
          personId: persons[0].id,
          leaveTypeId: annualLeave.id,
          year: currentYear,
          sessionId,
        },
        data: { used: 5 },
      });
    }
  });
}

const DEMO_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Removes demo sessions (and their scoped data) that have been inactive
 * for more than 24 hours. Called opportunistically during demo login.
 */
export async function cleanupStaleDemoSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - DEMO_SESSION_MAX_AGE_MS);

  const staleSessions = await prisma.demoSession.findMany({
    where: { lastActiveAt: { lt: cutoff } },
    select: { id: true },
  });

  const sessionIds = staleSessions.map((s) => s.id);
  if (sessionIds.length === 0) return 0;

  // Clean up real-time event buffers
  for (const id of sessionIds) {
    clearSessionEvents(id);
  }

  // Clean up audit logs from MongoDB (separate from PG transaction)
  if (isMongoAvailable()) {
    await getAuditLogCollection().deleteMany({ sessionId: { $in: sessionIds } });
  }

  await prisma.$transaction(async (tx) => {
    // Leave + position data references people, so remove it before persons
    // (the FKs are RESTRICT, not cascade).
    await tx.leaveRequest.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.leaveBalance.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.leaveType.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.position.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.teamMember.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.team.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.department.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.person.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.demoSession.deleteMany({ where: { id: { in: sessionIds } } });
  });

  return sessionIds.length;
}
