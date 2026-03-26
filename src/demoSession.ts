import { auth } from "@/auth";
import { prisma } from "@/db";
import { getAuditLogCollection, isMongoAvailable } from "@/mongoDb";
import { clearSessionEvents } from "@/lib/eventBus";
import { PERSON_SEEDS, TEAM_SEEDS, MEMBERSHIP_SEEDS, DEPARTMENT_SEEDS } from "@/seeds";

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
    await tx.teamMember.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.team.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.department.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.person.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.demoSession.deleteMany({ where: { id: { in: sessionIds } } });
  });

  return sessionIds.length;
}
