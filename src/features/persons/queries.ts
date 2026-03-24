import { prisma } from "@/db";
import { PersonSchema, Person, EmployeeProfileSchema, EmployeeProfile } from "@/schemas";
import { getDemoSessionId } from "@/demoSession";
import { PAGE_SIZE, PersonDeleteImpact } from "@/constants";

export async function getPersons(): Promise<Person[]> {
  const sessionId = await getDemoSessionId();
  const persons = await prisma.person.findMany({
    where: { deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
  });

  return persons.map((person) => PersonSchema.parse(person));
}

export async function getPagedPersons(
  opts: { page?: number; pageSize?: number; search?: string } = {},
): Promise<{ items: Person[]; total: number }> {
  const { page = 1, pageSize = PAGE_SIZE, search = "" } = opts;
  const sessionId = await getDemoSessionId();
  const q = search.trim();
  const where = {
    deletedAt: null as null,
    sessionId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { position: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [persons, total] = await Promise.all([
    prisma.person.findMany({
      where,
      omit: { sessionId: true, deletedAt: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.person.count({ where }),
  ]);
  return { items: persons.map((p) => PersonSchema.parse(p)), total };
}

export async function getEmployeeProfile(id: string): Promise<EmployeeProfile | null> {
  const sessionId = await getDemoSessionId();
  const person = await prisma.person.findFirst({
    where: { id, deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
    include: {
      teams: {
        where: { deletedAt: null, team: { deletedAt: null } },
        include: {
          team: { select: { teamId: true, teamName: true } },
        },
      },
      managedTeams: {
        where: { deletedAt: null, sessionId },
        select: { teamId: true, teamName: true },
      },
      headOfDepartments: {
        where: { deletedAt: null, sessionId },
        select: { id: true, name: true },
      },
    },
  });

  if (!person) return null;

  return EmployeeProfileSchema.parse({
    id: person.id,
    name: person.name,
    position: person.position,
    email: person.email,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
    teams: person.teams.map((tm) => ({
      teamId: tm.team.teamId,
      teamName: tm.team.teamName,
    })),
    managedTeams: person.managedTeams.map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
    })),
    headOfDepartments: person.headOfDepartments.map((d) => ({
      id: d.id,
      name: d.name,
    })),
  });
}

export async function getPersonDeleteImpact(personId: string): Promise<PersonDeleteImpact> {
  const sessionId = await getDemoSessionId();
  const [managedTeams, headedDepartments, teamMemberships, leaveRequests, reviewRequests] =
    await Promise.all([
      prisma.team.findMany({
        where: { teamManagerId: personId, deletedAt: null, sessionId },
        select: { teamId: true, teamName: true },
      }),
      prisma.department.findMany({
        where: { headId: personId, deletedAt: null, sessionId },
        select: { id: true, name: true },
      }),
      prisma.teamMember.findMany({
        where: { personId, deletedAt: null, sessionId },
        select: { team: { select: { teamId: true, teamName: true } } },
      }),
      prisma.leaveRequest.count({
        where: { personId, deletedAt: null, sessionId },
      }),
      prisma.reviewRequest.count({
        where: {
          OR: [{ subjectId: personId }, { reviewerId: personId }],
          sessionId,
        },
      }),
    ]);

  return {
    managedTeams: managedTeams.map((t) => ({ teamId: t.teamId, teamName: t.teamName })),
    headedDepartments: headedDepartments.map((d) => ({ id: d.id, name: d.name })),
    teamMemberships: teamMemberships.map((tm) => ({
      teamId: tm.team.teamId,
      teamName: tm.team.teamName,
    })),
    leaveRequests,
    reviewRequests,
  };
}
