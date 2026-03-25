import { prisma } from "@/db";
import { ActionError } from "@/actionErrors";
import {
  LeaveTypeSchema,
  LeaveRequestSchema,
  LeaveBalanceSchema,
  LeaveType,
  LeaveRequest,
  LeaveBalance,
} from "./schemas";
import { getDemoSessionId } from "@/demoSession";
import { hasPermission } from "@/permissions";

export async function getLeaveTypes(): Promise<LeaveType[]> {
  const allowed = await hasPermission("leave:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  const types = await prisma.leaveType.findMany({
    where: { deletedAt: null, sessionId },
    orderBy: { name: "asc" },
  });

  return types.map((t) =>
    LeaveTypeSchema.parse({
      id: t.id,
      name: t.name,
      description: t.description ?? null,
      defaultDays: t.defaultDays,
      color: t.color,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }),
  );
}

export async function getLeaveRequests(filters?: {
  personId?: string;
  status?: string;
}): Promise<LeaveRequest[]> {
  const allowed = await hasPermission("leave:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");

  const sessionId = await getDemoSessionId();
  const where: Record<string, unknown> = { deletedAt: null, sessionId };
  if (filters?.personId) where.personId = filters.personId;
  if (filters?.status) where.status = filters.status;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      person: { select: { name: true } },
      leaveType: { select: { name: true, color: true } },
      reviewer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) =>
    LeaveRequestSchema.parse({
      id: r.id,
      personId: r.personId,
      personName: r.person.name,
      leaveTypeId: r.leaveTypeId,
      leaveTypeName: r.leaveType.name,
      leaveTypeColor: r.leaveType.color,
      startDate: r.startDate,
      endDate: r.endDate,
      days: r.days,
      note: r.note ?? null,
      status: r.status,
      reviewerId: r.reviewerId ?? null,
      reviewerName: r.reviewer?.name ?? null,
      reviewNote: r.reviewNote ?? null,
      reviewedAt: r.reviewedAt ?? null,
      createdAt: r.createdAt,
    }),
  );
}

export async function getLeaveBalances(filters?: {
  personId?: string;
  year?: number;
}): Promise<LeaveBalance[]> {
  const allowed = await hasPermission("leave:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");

  const sessionId = await getDemoSessionId();
  const where: Record<string, unknown> = { sessionId };
  if (filters?.personId) where.personId = filters.personId;
  if (filters?.year) where.year = filters.year;

  const balances = await prisma.leaveBalance.findMany({
    where,
    include: {
      person: { select: { name: true } },
      leaveType: { select: { name: true, color: true } },
    },
    orderBy: [{ person: { name: "asc" } }, { leaveType: { name: "asc" } }],
  });

  return balances.map((b) =>
    LeaveBalanceSchema.parse({
      id: b.id,
      personId: b.personId,
      personName: b.person.name,
      leaveTypeId: b.leaveTypeId,
      leaveTypeName: b.leaveType.name,
      leaveTypeColor: b.leaveType.color,
      year: b.year,
      allocated: b.allocated,
      used: b.used,
      remaining: b.allocated - b.used,
    }),
  );
}
