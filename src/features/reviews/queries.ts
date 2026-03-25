import { prisma } from "@/db";
import {
  ReviewTemplateSchema,
  ReviewCycleSchema,
  ReviewRequestSchema,
  TeamReviewCycleSchema,
  ReviewTemplate,
  ReviewCycle,
  ReviewRequest,
  TeamReviewCycle,
} from "./schemas";
import { getDemoSessionId } from "@/demoSession";
import { hasPermission, getUserPermissions } from "@/permissions";
import { ActionError } from "@/actionErrors";

export async function getReviewTemplates(): Promise<ReviewTemplate[]> {
  const allowed = await hasPermission("review:manage");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  const templates = await prisma.reviewTemplate.findMany({
    where: { deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
    orderBy: { createdAt: "asc" },
  });

  return templates.map((t) =>
    ReviewTemplateSchema.parse({
      ...t,
      questions: Array.isArray(t.questions) ? t.questions : [],
    }),
  );
}

export async function getReviewTemplate(id: string): Promise<ReviewTemplate | null> {
  const allowed = await hasPermission("review:manage");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  const template = await prisma.reviewTemplate.findFirst({
    where: { id, deletedAt: null, sessionId },
    omit: { sessionId: true, deletedAt: true },
  });

  if (!template) return null;

  return ReviewTemplateSchema.parse({
    ...template,
    questions: Array.isArray(template.questions) ? template.questions : [],
  });
}

export async function getReviewCycles(): Promise<ReviewCycle[]> {
  const permissions = await getUserPermissions();
  if (!permissions["review:view"] && !permissions["review:manage"] && !permissions["review:submit"])
    throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  const cycles = await prisma.reviewCycle.findMany({
    where: { deletedAt: null, sessionId },
    include: {
      template: { select: { name: true } },
      requests: { select: { status: true } },
    },
    omit: { sessionId: true, deletedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return cycles.map((c) =>
    ReviewCycleSchema.parse({
      id: c.id,
      name: c.name,
      templateId: c.templateId ?? null,
      templateName: c.template?.name ?? null,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      requestCount: c.requests.length,
      submittedCount: c.requests.filter((r) => r.status === "SUBMITTED").length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }),
  );
}

export async function getReviewCycle(id: string): Promise<
  | (ReviewCycle & {
      requests: ReviewRequest[];
    })
  | null
> {
  const permissions = await getUserPermissions();
  if (!permissions["review:view"] && !permissions["review:manage"] && !permissions["review:submit"])
    throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();
  const cycle = await prisma.reviewCycle.findFirst({
    where: { id, deletedAt: null, sessionId },
    include: {
      template: { select: { name: true } },
      requests: {
        include: {
          subject: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    omit: { sessionId: true, deletedAt: true },
  });

  if (!cycle) return null;

  const parsedCycle = ReviewCycleSchema.parse({
    id: cycle.id,
    name: cycle.name,
    templateId: cycle.templateId ?? null,
    templateName: cycle.template?.name ?? null,
    status: cycle.status,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    requestCount: cycle.requests.length,
    submittedCount: cycle.requests.filter((r) => r.status === "SUBMITTED").length,
    createdAt: cycle.createdAt,
    updatedAt: cycle.updatedAt,
  });

  const requests = cycle.requests.map((r) =>
    ReviewRequestSchema.parse({
      id: r.id,
      cycleId: r.cycleId,
      cycleName: cycle.name,
      cycleStatus: cycle.status,
      subjectId: r.subjectId ?? null,
      subjectName: r.subject?.name ?? null,
      reviewerId: r.reviewerId ?? null,
      reviewerName: r.reviewer?.name ?? null,
      type: r.type,
      status: r.status,
      createdAt: r.createdAt,
    }),
  );

  return { ...parsedCycle, requests };
}

export async function getMyReviewRequests(reviewerPersonId?: string): Promise<ReviewRequest[]> {
  const allowed = await hasPermission("review:submit");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();

  if (!reviewerPersonId) return [];

  const requests = await prisma.reviewRequest.findMany({
    where: {
      reviewerId: reviewerPersonId,
      status: "PENDING",
      sessionId,
      cycle: { status: "OPEN", deletedAt: null, sessionId },
    },
    include: {
      cycle: { select: { name: true, status: true } },
      subject: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
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

export async function getReviewRequestWithTemplate(requestId: string): Promise<{
  request: ReviewRequest;
  template: ReviewTemplate | null;
} | null> {
  const allowed = await hasPermission("review:submit");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");
  const sessionId = await getDemoSessionId();

  const request = await prisma.reviewRequest.findFirst({
    where: { id: requestId, sessionId },
    include: {
      cycle: {
        include: {
          template: true,
        },
      },
      subject: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
  });

  if (!request) return null;

  const parsedRequest = ReviewRequestSchema.parse({
    id: request.id,
    cycleId: request.cycleId,
    cycleName: request.cycle.name,
    cycleStatus: request.cycle.status,
    subjectId: request.subjectId ?? null,
    subjectName: request.subject?.name ?? null,
    reviewerId: request.reviewerId ?? null,
    reviewerName: request.reviewer?.name ?? null,
    type: request.type,
    status: request.status,
    createdAt: request.createdAt,
  });

  const template = request.cycle.template
    ? ReviewTemplateSchema.parse({
        ...request.cycle.template,
        questions: Array.isArray(request.cycle.template.questions)
          ? request.cycle.template.questions
          : [],
      })
    : null;

  return { request: parsedRequest, template };
}

export async function getManagerTeamReviews(managerPersonId: string): Promise<TeamReviewCycle[]> {
  const allowed = await hasPermission("review:view");
  if (!allowed) throw new ActionError("permissionDenied", "Permission denied");

  const sessionId = await getDemoSessionId();

  const teams = await prisma.team.findMany({
    where: { teamManagerId: managerPersonId, deletedAt: null, sessionId },
    include: {
      members: {
        where: { deletedAt: null },
        include: { person: { select: { id: true, name: true } } },
      },
    },
  });

  const directReportIds = [...new Set(teams.flatMap((t) => t.members.map((m) => m.personId)))];
  if (directReportIds.length === 0) return [];

  const requests = await prisma.reviewRequest.findMany({
    where: { subjectId: { in: directReportIds }, sessionId },
    include: {
      subject: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
      cycle: { select: { id: true, name: true, status: true, startDate: true } },
    },
    orderBy: [{ cycle: { startDate: "desc" } }, { subject: { name: "asc" } }],
  });

  const cycleOrder: string[] = [];
  const cycleMap = new Map<
    string,
    {
      cycleName: string;
      cycleStatus: string;
      reports: Map<
        string,
        {
          subjectName: string;
          requests: {
            id: string;
            type: string;
            status: string;
            reviewerId: string | null;
            reviewerName: string | null;
          }[];
        }
      >;
    }
  >();

  for (const req of requests) {
    const cycleId = req.cycleId;
    if (!cycleMap.has(cycleId)) {
      cycleOrder.push(cycleId);
      cycleMap.set(cycleId, {
        cycleName: req.cycle.name,
        cycleStatus: req.cycle.status,
        reports: new Map(),
      });
    }
    const cycle = cycleMap.get(cycleId)!;
    const subjectId = req.subjectId ?? "";
    if (subjectId && !cycle.reports.has(subjectId)) {
      cycle.reports.set(subjectId, { subjectName: req.subject?.name ?? "", requests: [] });
    }
    if (subjectId) {
      cycle.reports.get(subjectId)!.requests.push({
        id: req.id,
        type: req.type,
        status: req.status,
        reviewerId: req.reviewerId ?? null,
        reviewerName: req.reviewer?.name ?? null,
      });
    }
  }

  return cycleOrder.map((cycleId) => {
    const cycle = cycleMap.get(cycleId)!;
    return TeamReviewCycleSchema.parse({
      cycleId,
      cycleName: cycle.cycleName,
      cycleStatus: cycle.cycleStatus,
      reports: [...cycle.reports.entries()].map(([subjectId, report]) => ({
        subjectId,
        subjectName: report.subjectName,
        requests: report.requests,
      })),
    });
  });
}
