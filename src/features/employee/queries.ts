import { prisma } from "@/db";
import { auth } from "@/auth";
import { getDemoSessionId } from "@/demoSession";
import { EmployeeProfileSchema, EmployeeProfile } from "./schemas";
import {
  LeaveRequestSchema,
  LeaveRequest,
  LeaveBalanceSchema,
  LeaveBalance,
} from "@/features/leave/schemas";
import { ReviewRequestSchema, ReviewRequest } from "@/features/reviews/schemas";

/**
 * Look up the Person record whose email matches the authenticated user's email.
 * Returns null when the user is not authenticated or no Person has their email.
 * This is the linking mechanism — Person.email === User.email.
 */
export async function getLinkedPerson(): Promise<{ id: string; name: string } | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const sessionId = await getDemoSessionId();
  const person = await prisma.person.findFirst({
    where: { email: session.user.email, deletedAt: null, sessionId },
    select: { id: true, name: true },
  });

  return person ?? null;
}

/**
 * Fetch the full EmployeeProfile for the authenticated user's linked Person.
 * Returns null when no Person is linked to the session user.
 * IDOR-safe: always derives personId from the authenticated session — never trusts caller-supplied IDs.
 */
export async function getSelfProfile(): Promise<EmployeeProfile | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const sessionId = await getDemoSessionId();

  const person = await prisma.person.findFirst({
    where: { email: session.user.email, deletedAt: null, sessionId },
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

/**
 * Fetch leave requests for the authenticated user's linked Person.
 * IDOR-safe: personId is derived from the session, never passed in by the caller.
 */
export async function getSelfLeaveRequests(): Promise<LeaveRequest[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  const sessionId = await getDemoSessionId();

  const person = await prisma.person.findFirst({
    where: { email: session.user.email, deletedAt: null, sessionId },
    select: { id: true },
  });

  if (!person) return [];

  const requests = await prisma.leaveRequest.findMany({
    where: { personId: person.id, deletedAt: null, sessionId },
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

/**
 * Fetch leave balances for the authenticated user's linked Person (current year).
 * IDOR-safe: personId is derived from the session, never passed in by the caller.
 */
export async function getSelfLeaveBalances(year?: number): Promise<LeaveBalance[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  const sessionId = await getDemoSessionId();

  const person = await prisma.person.findFirst({
    where: { email: session.user.email, deletedAt: null, sessionId },
    select: { id: true },
  });

  if (!person) return [];

  const where: Record<string, unknown> = { personId: person.id, sessionId };
  if (year) where.year = year;

  const balances = await prisma.leaveBalance.findMany({
    where,
    include: {
      person: { select: { name: true } },
      leaveType: { select: { name: true, color: true } },
    },
    orderBy: [{ leaveType: { name: "asc" } }],
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

/**
 * Fetch performance review requests where the authenticated user's linked Person is the subject.
 * IDOR-safe: subjectId is derived from the session, never passed in by the caller.
 */
export async function getSelfReviews(): Promise<ReviewRequest[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  const sessionId = await getDemoSessionId();

  const person = await prisma.person.findFirst({
    where: { email: session.user.email, deletedAt: null, sessionId },
    select: { id: true },
  });

  if (!person) return [];

  const requests = await prisma.reviewRequest.findMany({
    where: {
      subjectId: person.id,
      sessionId,
      cycle: { deletedAt: null },
    },
    include: {
      cycle: { select: { name: true, status: true } },
      subject: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) =>
    ReviewRequestSchema.parse({
      id: r.id,
      cycleId: r.cycleId,
      cycleName: r.cycle.name,
      cycleStatus: r.cycle.status,
      subjectId: r.subjectId ?? null,
      subjectName: r.subject?.name ?? null,
      reviewerId: r.reviewerId ?? null,
      reviewerName: r.reviewer?.name ?? null,
      type: r.type,
      status: r.status,
      createdAt: r.createdAt,
    }),
  );
}
