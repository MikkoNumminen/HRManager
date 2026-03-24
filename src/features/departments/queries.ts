import { prisma } from "@/db";
import { DepartmentSchema, Department } from "@/schemas";
import { getDemoSessionId } from "@/demoSession";
import { PAGE_SIZE, DepartmentDeleteImpact } from "@/constants";

export async function getDepartments(): Promise<Department[]> {
  const sessionId = await getDemoSessionId();
  const departments = await prisma.department.findMany({
    where: { deletedAt: null, sessionId },
    include: {
      head: true,
      teams: { where: { deletedAt: null, sessionId } },
    },
  });

  return departments.map((dept) =>
    DepartmentSchema.parse({
      id: dept.id,
      name: dept.name,
      description: dept.description ?? null,
      headId: dept.headId ?? null,
      headName: dept.head?.name ?? null,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
      teams: dept.teams.map((t) => ({
        teamId: t.teamId,
        teamName: t.teamName,
      })),
    }),
  );
}

export async function getPagedDepartments(
  opts: { page?: number; pageSize?: number; search?: string } = {},
): Promise<{ items: Department[]; total: number }> {
  const { page = 1, pageSize = PAGE_SIZE, search = "" } = opts;
  const sessionId = await getDemoSessionId();
  const q = search.trim();
  const baseWhere = {
    deletedAt: null as null,
    sessionId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { head: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where: baseWhere,
      include: {
        head: true,
        teams: { where: { deletedAt: null, sessionId } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.department.count({ where: baseWhere }),
  ]);

  const items = departments.map((dept) =>
    DepartmentSchema.parse({
      id: dept.id,
      name: dept.name,
      description: dept.description ?? null,
      headId: dept.headId ?? null,
      headName: dept.head?.name ?? null,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
      teams: dept.teams.map((t) => ({
        teamId: t.teamId,
        teamName: t.teamName,
      })),
    }),
  );
  return { items, total };
}

export async function getDepartmentDeleteImpact(
  departmentId: string,
): Promise<DepartmentDeleteImpact> {
  const sessionId = await getDemoSessionId();
  const teams = await prisma.team.findMany({
    where: { departmentId, deletedAt: null, sessionId },
    select: { teamId: true, teamName: true },
  });

  return {
    teams: teams.map((t) => ({ teamId: t.teamId, teamName: t.teamName })),
  };
}
