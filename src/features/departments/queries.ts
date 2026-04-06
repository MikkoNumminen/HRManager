import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import { DepartmentSchema, Department } from "./schemas";
import { getDemoSessionId } from "@/demoSession";
import { hasPermission } from "@/permissions";
import { PAGE_SIZE, DepartmentDeleteImpact } from "@/constants";
import { cache } from "@/lib/cache";
import { ORG_DATA_TAG } from "@/lib/cacheInvalidation";

// Cache TTL: 5 minutes. Invalidated by updateTag(ORG_DATA_TAG) from mutations.
const CACHE_TTL = 300;

export async function getDepartments(): Promise<Department[]> {
  const allowed = await hasPermission("department:read");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  return fetchDepartmentsCached(sessionId);
}

const fetchDepartmentsCached = cache(
  async (sessionId: string | null): Promise<Department[]> => {
    // Use select on head to avoid fetching full Person record (N+1 prevention).
    const departments = await prisma.department.findMany({
      where: { deletedAt: null, sessionId },
      include: {
        head: { select: { name: true } },
        teams: { where: { deletedAt: null, sessionId }, select: { teamId: true, teamName: true } },
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
  },
  ["departments-list"],
  { revalidate: CACHE_TTL, tags: [ORG_DATA_TAG] },
);

export async function getPagedDepartments(
  opts: { page?: number; pageSize?: number; search?: string } = {},
): Promise<{ items: Department[]; total: number }> {
  const allowed = await hasPermission("department:read");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
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
        head: { select: { name: true } },
        teams: { where: { deletedAt: null, sessionId }, select: { teamId: true, teamName: true } },
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
  const allowed = await hasPermission("department:read");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  const teams = await prisma.team.findMany({
    where: { departmentId, deletedAt: null, sessionId },
    select: { teamId: true, teamName: true },
  });

  return {
    teams: teams.map((t) => ({ teamId: t.teamId, teamName: t.teamName })),
  };
}
