import { auth } from "@/auth";
import { prisma } from "@/db";

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
    const personSeeds = [
      { name: "Alice Johnson", position: "Engineering Manager", email: "alice@example.com" },
      { name: "Bob Williams", position: "Senior Developer", email: "bob@example.com" },
      { name: "Carol Davis", position: "UX Designer", email: "carol@example.com" },
      { name: "Dave Martinez", position: "Backend Developer", email: "dave@example.com" },
      { name: "Eve Thompson", position: "QA Engineer", email: "eve@example.com" },
      { name: "Frank Lee", position: "Product Owner", email: "frank@example.com" },
      { name: "Grace Park", position: "DevOps Lead", email: "grace@example.com" },
      { name: "Henry Chen", position: "Data Analyst", email: "henry@example.com" },
      { name: "Ivy Santos", position: "HR Coordinator", email: "ivy@example.com" },
    ];
    const persons = [];
    for (const p of personSeeds) {
      const person = await tx.person.create({ data: { ...p, sessionId } });
      persons.push(person);
    }
    const [alice, bob, carol, dave, eve, frank, grace, henry, ivy] = persons;

    const teamSeeds = [
      { teamName: "Engineering", teamManagerId: alice.id },
      { teamName: "Design", teamManagerId: carol.id },
      { teamName: "Platform", teamManagerId: grace.id },
      { teamName: "Data Analytics", teamManagerId: henry.id },
      { teamName: "People & Culture", teamManagerId: ivy.id },
    ];
    const teams = [];
    for (const t of teamSeeds) {
      const team = await tx.team.create({ data: { ...t, sessionId } });
      teams.push(team);
    }
    const [engineering, design, platform, dataAnalytics, peopleCulture] = teams;

    const memberships = [
      { personId: alice.id, teamId: engineering.teamId },
      { personId: bob.id, teamId: engineering.teamId },
      { personId: dave.id, teamId: engineering.teamId },
      { personId: eve.id, teamId: engineering.teamId },
      { personId: carol.id, teamId: design.teamId },
      { personId: frank.id, teamId: design.teamId },
      { personId: grace.id, teamId: platform.teamId },
      { personId: dave.id, teamId: platform.teamId },
      { personId: henry.id, teamId: dataAnalytics.teamId },
      { personId: ivy.id, teamId: peopleCulture.teamId },
    ];
    for (const m of memberships) {
      await tx.teamMember.create({ data: { ...m, sessionId } });
    }

    const departmentSeeds = [
      {
        name: "Engineering",
        description: "Software development and infrastructure",
        headId: alice.id,
        teamNames: ["Engineering", "Platform"],
      },
      {
        name: "Product & Design",
        description: "Product management, UX, and design",
        headId: frank.id,
        teamNames: ["Design"],
      },
      {
        name: "Data",
        description: "Analytics, reporting, and data engineering",
        headId: henry.id,
        teamNames: ["Data Analytics"],
      },
      {
        name: "Human Resources",
        description: "People operations and talent management",
        headId: ivy.id,
        teamNames: ["People & Culture"],
      },
    ];
    for (const d of departmentSeeds) {
      const dept = await tx.department.create({
        data: { name: d.name, description: d.description, headId: d.headId, sessionId },
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

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.teamMember.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.team.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.department.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.person.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.demoSession.deleteMany({ where: { id: { in: sessionIds } } });
  });

  return sessionIds.length;
}
