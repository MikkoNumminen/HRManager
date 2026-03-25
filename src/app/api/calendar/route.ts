import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { LeaveRequestStatus } from "@prisma/client";
import { getDemoSessionId } from "@/demoSession";
import { generateICS } from "@/lib/ical";
import { hasPermission } from "@/permissions";

// Export approved leave requests as an iCal (.ics) calendar file.
// Supports optional ?personId= query param to filter by person.
// Requires leave:view permission.
export async function GET(request: Request): Promise<NextResponse> {
  const allowed = await hasPermission("leave:view");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessionId = await getDemoSessionId();
  const url = new URL(request.url);
  const personId = url.searchParams.get("personId");

  const where: Record<string, unknown> = {
    status: LeaveRequestStatus.APPROVED,
    deletedAt: null,
    sessionId,
  };
  if (personId) where.personId = personId;

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: {
      person: { select: { name: true } },
      leaveType: { select: { name: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const events = requests.map((r) => ({
    uid: `leave-${r.id}@hrmanager`,
    summary: `${r.person.name} — ${r.leaveType.name}`,
    description: r.note ?? undefined,
    startDate: r.startDate,
    endDate: r.endDate,
    createdAt: r.createdAt,
  }));

  const calendarName = personId
    ? `Leave — ${requests[0]?.person.name ?? "Employee"}`
    : "Team Leave Calendar";

  const ics = generateICS(events, calendarName);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leave-calendar.ics"',
    },
  });
}
