import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import { TeamSchema, CombinedTeam } from "./schemas";
import { getDemoSessionId } from "@/demoSession";
import { hasPermission } from "@/permissions";
import { PAGE_SIZE, TeamDeleteImpact } from "@/constants";

export async function getTeams(): Promise<CombinedTeam[]> {
  const allowed = await hasPermission("team:read");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  // Use select on relations to avoid fetching full records (performance at scale).
  const teams = await prisma.team.findMany({
    where: { deletedAt: null, sessionId },
    include: {
      manager: { select: { name: true } },
      department: { select: { name: true } },
      members: {
        where: { deletedAt: null, sessionId },
        include: {
          person: { select: { name: true, email: true } },
        },
      },
    },
  });

  return teams.map((team) =>
    TeamSchema.parse({
      teamId: team.teamId,
      teamName: team.teamName,
      teamManagerId: team.teamManagerId ?? null,
      managerName: team.manager?.name ?? null,
      departmentId: team.departmentId ?? null,
      departmentName: team.department?.name ?? null,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      members:
        team.members?.map((member) => ({
          personId: member.personId,
          name: member.person.name,
          email: member.person.email ?? null,
        })) ?? [],
    }),
  );
}

export async function getPagedTeams(
  opts: { page?: number; pageSize?: number; search?: string } = {},
): Promise<{ items: CombinedTeam[]; total: number }> {
  const allowed = await hasPermission("team:read");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const { page = 1, pageSize = PAGE_SIZE, search = "" } = opts;
  const sessionId = await getDemoSessionId();
  const q = search.trim();

  // For search we need to post-filter after joining — use findMany with includes and slice
  // Prisma can filter on relation fields but not across OR + relation simultaneously cleanly,
  // so we fetch with relation filter where possible and do member search in JS.
  const baseWhere = {
    deletedAt: null as null,
    sessionId,
    ...(q
      ? {
          OR: [
            { teamName: { contains: q, mode: "insensitive" as const } },
            { manager: { name: { contains: q, mode: "insensitive" as const } } },
            { department: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where: baseWhere,
      include: {
        manager: { select: { name: true } },
        department: { select: { name: true } },
        members: {
          where: { deletedAt: null, sessionId },
          include: { person: { select: { name: true, email: true } } },
        },
      },
      orderBy: { teamName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.team.count({ where: baseWhere }),
  ]);

  const items = teams.map((team) =>
    TeamSchema.parse({
      teamId: team.teamId,
      teamName: team.teamName,
      teamManagerId: team.teamManagerId ?? null,
      managerName: team.manager?.name ?? null,
      departmentId: team.departmentId ?? null,
      departmentName: team.department?.name ?? null,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      members:
        team.members?.map((member) => ({
          personId: member.personId,
          name: member.person.name,
          email: member.person.email ?? null,
        })) ?? [],
    }),
  );
  return { items, total };
}

export async function getTeamDeleteImpact(teamId: string): Promise<TeamDeleteImpact> {
  const allowed = await hasPermission("team:read");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  const [memberCount, team] = await Promise.all([
    prisma.teamMember.count({
      where: { teamId, deletedAt: null, sessionId },
    }),
    prisma.team.findFirst({
      where: { teamId, deletedAt: null, sessionId },
      select: { department: { select: { name: true } } },
    }),
  ]);

  return {
    memberCount,
    departmentName: team?.department?.name ?? null,
  };
}
