"use server";
// Leave request lifecycle: submission, review (approve/reject), and deletion.
import { LeaveRequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_LEAVE_NOTE_LENGTH } from "../schemas";
import { safe, validateUUID, type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";
import { prisma } from "@/db";
import { requirePermission } from "@/permissions";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { getTranslations } from "next-intl/server";

export async function createLeaveRequest(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:request");
    await rateLimit("createLeaveRequest");

    const personId = data.get("personId")?.valueOf();
    if (typeof personId !== "string")
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    validateUUID(personId, "personId");

    const leaveTypeId = data.get("leaveTypeId")?.valueOf();
    if (typeof leaveTypeId !== "string")
      throw new ActionError("leaveTypeRequired", t("leaveTypeRequired"));
    validateUUID(leaveTypeId, "leaveTypeId");

    const startDateStr = data.get("startDate")?.valueOf();
    const endDateStr = data.get("endDate")?.valueOf();
    if (typeof startDateStr !== "string" || typeof endDateStr !== "string")
      throw new ActionError("invalidDateRange", t("invalidDateRange"));

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
      throw new ActionError("invalidDateRange", t("invalidDateRange"));
    if (endDate < startDate)
      throw new ActionError("endDateBeforeStartDate", t("endDateBeforeStartDate"));

    const daysStr = data.get("days")?.valueOf();
    const days = typeof daysStr === "string" ? parseInt(daysStr, 10) : 0;
    if (isNaN(days) || days < 1) throw new ActionError("invalidDaysValue", t("invalidDaysValue"));

    const note = data.get("note")?.valueOf();
    const noteStr = typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
    if (noteStr && noteStr.length > MAX_LEAVE_NOTE_LENGTH)
      throw new ActionError("noteTooLong", t("noteTooLong", { max: MAX_LEAVE_NOTE_LENGTH }));

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const person = await tx.person.findFirst({
        where: { id: personId, deletedAt: null, sessionId },
      });
      if (!person) throw new ActionError("personNotFound", t("personNotFound"));

      const leaveType = await tx.leaveType.findFirst({
        where: { id: leaveTypeId, deletedAt: null, sessionId },
      });
      if (!leaveType) throw new ActionError("leaveTypeNotFound", t("leaveTypeNotFound"));

      // Check for overlapping leave requests
      const overlapping = await tx.leaveRequest.findFirst({
        where: {
          personId,
          deletedAt: null,
          sessionId,
          status: { not: LeaveRequestStatus.REJECTED },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });
      if (overlapping)
        throw new ActionError("leaveRequestOverlapping", t("leaveRequestOverlapping"));

      // Check balance
      const year = startDate.getFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: { personId_leaveTypeId_year: { personId, leaveTypeId, year } },
      });
      if (balance && balance.allocated - balance.used < days)
        throw new ActionError("insufficientLeaveBalance", t("insufficientLeaveBalance"));

      const request = await tx.leaveRequest.create({
        data: {
          personId,
          leaveTypeId,
          startDate,
          endDate,
          days,
          note: noteStr,
          sessionId,
        },
      });
      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "leaveRequest",
        entityId: request.id,
        after: {
          personName: person.name,
          leaveType: leaveType.name,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days,
        },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

export async function reviewLeaveRequest(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:approve");
    await rateLimit("reviewLeaveRequest");

    const id = data.get("id")?.valueOf();
    if (typeof id !== "string") throw new ActionError("invalidId", t("invalidId"));
    validateUUID(id, "leaveRequestId");

    const action = data.get("action")?.valueOf();
    if (action !== LeaveRequestStatus.APPROVED && action !== LeaveRequestStatus.REJECTED)
      throw new ActionError("invalidLeaveAction", t("invalidLeaveAction"));

    const reviewerId = data.get("reviewerId")?.valueOf();
    const reviewerIdStr = typeof reviewerId === "string" ? reviewerId : null;
    if (reviewerIdStr) validateUUID(reviewerIdStr, "reviewerId");

    const reviewNote = data.get("reviewNote")?.valueOf();
    const reviewNoteStr =
      typeof reviewNote === "string" && reviewNote.trim().length > 0 ? reviewNote.trim() : null;
    if (reviewNoteStr && reviewNoteStr.length > MAX_LEAVE_NOTE_LENGTH)
      throw new ActionError("noteTooLong", t("noteTooLong", { max: MAX_LEAVE_NOTE_LENGTH }));

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findFirst({
        where: { id, deletedAt: null, sessionId, status: LeaveRequestStatus.PENDING },
        include: { person: true, leaveType: true },
      });
      if (!request) throw new ActionError("leaveRequestNotFound", t("leaveRequestNotFound"));

      // Atomic status transition. Guards against two reviewers (or a double-click)
      // both seeing PENDING and both incrementing the balance: only the transition
      // that actually flips PENDING -> action proceeds; the loser matches 0 rows.
      const transition = await tx.leaveRequest.updateMany({
        where: { id, deletedAt: null, sessionId, status: LeaveRequestStatus.PENDING },
        data: {
          status: action,
          reviewerId: reviewerIdStr,
          reviewNote: reviewNoteStr,
          reviewedAt: new Date(),
        },
      });
      if (transition.count === 0) {
        throw new ActionError("leaveRequestNotFound", t("leaveRequestNotFound"));
      }

      // If approved, update the balance — re-checking capacity at approval time, since
      // the create-time check can be stale once other requests have been approved.
      if (action === LeaveRequestStatus.APPROVED) {
        const year = request.startDate.getFullYear();
        const existing = await tx.leaveBalance.findUnique({
          where: {
            personId_leaveTypeId_year: {
              personId: request.personId,
              leaveTypeId: request.leaveTypeId,
              year,
            },
          },
        });
        // Mirror the create-time check: only an existing balance caps the request
        // (no balance row means the type is uncapped, e.g. unpaid leave).
        if (existing && existing.allocated - existing.used < request.days) {
          throw new ActionError("insufficientLeaveBalance", t("insufficientLeaveBalance"));
        }
        await tx.leaveBalance.upsert({
          where: {
            personId_leaveTypeId_year: {
              personId: request.personId,
              leaveTypeId: request.leaveTypeId,
              year,
            },
          },
          create: {
            personId: request.personId,
            leaveTypeId: request.leaveTypeId,
            year,
            allocated: request.leaveType.defaultDays,
            used: request.days,
            sessionId,
          },
          update: { used: { increment: request.days } },
        });
      }

      auditEntries.push({
        ...ctx,
        action: action === LeaveRequestStatus.APPROVED ? "approve" : "reject",
        entityType: "leaveRequest",
        entityId: id,
        before: { status: LeaveRequestStatus.PENDING },
        after: {
          status: action,
          personName: request.person.name,
          leaveType: request.leaveType.name,
          days: request.days,
          reviewNote: reviewNoteStr,
        },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

export const deleteLeaveRequest: (data: FormData) => Promise<ActionResult> = guardedAction(
  "leave:request",
  "deleteLeaveRequest",
  async (t, data: FormData) => {
    const id = data.get("id")?.valueOf();
    if (typeof id !== "string") throw new ActionError("invalidId", t("invalidId"));
    validateUUID(id, "leaveRequestId");

    const sessionId = await getDemoSessionId();
    const now = new Date();
    await withAuditedTransaction(async (tx, addAudit) => {
      const request = await tx.leaveRequest.findFirst({
        where: { id, deletedAt: null, sessionId },
        include: { person: true, leaveType: true },
      });
      if (!request) throw new ActionError("leaveRequestNotFound", t("leaveRequestNotFound"));
      if (request.status !== LeaveRequestStatus.PENDING)
        throw new ActionError("cannotDeleteNonPendingRequest", t("cannotDeleteNonPendingRequest"));

      await tx.leaveRequest.update({ where: { id }, data: { deletedAt: now } });
      addAudit({
        action: "delete",
        entityType: "leaveRequest",
        entityId: id,
        before: {
          personName: request.person.name,
          leaveType: request.leaveType.name,
          startDate: request.startDate.toISOString(),
          endDate: request.endDate.toISOString(),
          days: request.days,
        },
      });
    });
    revalidatePath("/leave");
  },
);
