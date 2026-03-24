"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/permissions";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_LEAVE_NOTE_LENGTH } from "@/schemas";
import { getTranslations } from "next-intl/server";
import { safe, validateUUID, type ActionResult } from "@/lib/actionUtils";

// ─── Leave Management ────────────────────────────────────────────

export async function createLeaveType(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:manage_types");
    await rateLimit("createLeaveType");

    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0)
      throw new ActionError("invalidName", t("invalidName"));
    if (name.trim().length > MAX_NAME_LENGTH)
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));

    const description = data.get("description")?.valueOf();
    const descStr =
      typeof description === "string" && description.trim().length > 0 ? description.trim() : null;
    if (descStr && descStr.length > MAX_DESCRIPTION_LENGTH)
      throw new ActionError(
        "descriptionTooLong",
        t("descriptionTooLong", { max: MAX_DESCRIPTION_LENGTH }),
      );

    const defaultDaysStr = data.get("defaultDays")?.valueOf();
    const defaultDays = typeof defaultDaysStr === "string" ? parseInt(defaultDaysStr, 10) : 0;
    if (isNaN(defaultDays) || defaultDays < 0)
      throw new ActionError("invalidDaysValue", t("invalidDaysValue"));

    const color = (data.get("color")?.valueOf() as string) ?? "#1976d2";

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const existing = await tx.leaveType.findFirst({
        where: { name: name.trim(), deletedAt: null, sessionId },
      });
      if (existing) throw new ActionError("leaveTypeAlreadyExists", t("leaveTypeAlreadyExists"));

      const leaveType = await tx.leaveType.create({
        data: { name: name.trim(), description: descStr, defaultDays, color, sessionId },
      });
      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "leaveType",
        entityId: leaveType.id,
        after: { name: leaveType.name, defaultDays, color },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

export async function updateLeaveType(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:manage_types");
    await rateLimit("updateLeaveType");

    const id = data.get("id")?.valueOf();
    if (typeof id !== "string") throw new ActionError("invalidId", t("invalidId"));
    validateUUID(id, "leaveTypeId");

    const name = data.get("name")?.valueOf();
    if (typeof name !== "string" || name.trim().length === 0)
      throw new ActionError("invalidName", t("invalidName"));
    if (name.trim().length > MAX_NAME_LENGTH)
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));

    const description = data.get("description")?.valueOf();
    const descStr =
      typeof description === "string" && description.trim().length > 0 ? description.trim() : null;

    const defaultDaysStr = data.get("defaultDays")?.valueOf();
    const defaultDays = typeof defaultDaysStr === "string" ? parseInt(defaultDaysStr, 10) : 0;
    if (isNaN(defaultDays) || defaultDays < 0)
      throw new ActionError("invalidDaysValue", t("invalidDaysValue"));

    const color = (data.get("color")?.valueOf() as string) ?? "#1976d2";

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    await prisma.$transaction(async (tx) => {
      const existing = await tx.leaveType.findFirst({
        where: { id, deletedAt: null, sessionId },
      });
      if (!existing) throw new ActionError("leaveTypeNotFound", t("leaveTypeNotFound"));

      const duplicate = await tx.leaveType.findFirst({
        where: { name: name.trim(), deletedAt: null, sessionId, NOT: { id } },
      });
      if (duplicate) throw new ActionError("leaveTypeAlreadyExists", t("leaveTypeAlreadyExists"));

      await tx.leaveType.update({
        where: { id },
        data: { name: name.trim(), description: descStr, defaultDays, color },
      });
      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "leaveType",
        entityId: id,
        before: { name: existing.name, defaultDays: existing.defaultDays, color: existing.color },
        after: { name: name.trim(), defaultDays, color },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

export async function deleteLeaveType(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:manage_types");
    await rateLimit("deleteLeaveType");

    const id = data.get("id")?.valueOf();
    if (typeof id !== "string") throw new ActionError("invalidId", t("invalidId"));
    validateUUID(id, "leaveTypeId");

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const existing = await tx.leaveType.findFirst({
        where: { id, deletedAt: null, sessionId },
      });
      if (!existing) throw new ActionError("leaveTypeNotFound", t("leaveTypeNotFound"));

      await tx.leaveType.update({ where: { id }, data: { deletedAt: now } });
      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "leaveType",
        entityId: id,
        before: { name: existing.name },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

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
          status: { not: "rejected" },
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
    if (action !== "approved" && action !== "rejected")
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
        where: { id, deletedAt: null, sessionId, status: "pending" },
        include: { person: true, leaveType: true },
      });
      if (!request) throw new ActionError("leaveRequestNotFound", t("leaveRequestNotFound"));

      await tx.leaveRequest.update({
        where: { id },
        data: {
          status: action,
          reviewerId: reviewerIdStr,
          reviewNote: reviewNoteStr,
          reviewedAt: new Date(),
        },
      });

      // If approved, update the balance
      if (action === "approved") {
        const year = request.startDate.getFullYear();
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
        action: action === "approved" ? "approve" : "reject",
        entityType: "leaveRequest",
        entityId: id,
        before: { status: "pending" },
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

export async function deleteLeaveRequest(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:request");
    await rateLimit("deleteLeaveRequest");

    const id = data.get("id")?.valueOf();
    if (typeof id !== "string") throw new ActionError("invalidId", t("invalidId"));
    validateUUID(id, "leaveRequestId");

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findFirst({
        where: { id, deletedAt: null, sessionId },
        include: { person: true, leaveType: true },
      });
      if (!request) throw new ActionError("leaveRequestNotFound", t("leaveRequestNotFound"));
      if (request.status !== "pending")
        throw new ActionError("cannotDeleteNonPendingRequest", t("cannotDeleteNonPendingRequest"));

      await tx.leaveRequest.update({ where: { id }, data: { deletedAt: now } });
      auditEntries.push({
        ...ctx,
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
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}

export async function allocateLeaveBalance(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("leave:manage_types");
    await rateLimit("allocateLeaveBalance");

    const personId = data.get("personId")?.valueOf();
    if (typeof personId !== "string")
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    validateUUID(personId, "personId");

    const leaveTypeId = data.get("leaveTypeId")?.valueOf();
    if (typeof leaveTypeId !== "string")
      throw new ActionError("leaveTypeRequired", t("leaveTypeRequired"));
    validateUUID(leaveTypeId, "leaveTypeId");

    const yearStr = data.get("year")?.valueOf();
    const year = typeof yearStr === "string" ? parseInt(yearStr, 10) : new Date().getFullYear();
    if (isNaN(year) || year < 2000 || year > 2100)
      throw new ActionError("invalidYear", t("invalidYear"));

    const allocatedStr = data.get("allocated")?.valueOf();
    const allocated = typeof allocatedStr === "string" ? parseInt(allocatedStr, 10) : 0;
    if (isNaN(allocated) || allocated < 0)
      throw new ActionError("invalidDaysValue", t("invalidDaysValue"));

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

      const balance = await tx.leaveBalance.upsert({
        where: { personId_leaveTypeId_year: { personId, leaveTypeId, year } },
        create: { personId, leaveTypeId, year, allocated, sessionId },
        update: { allocated },
      });

      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "leaveBalance",
        entityId: balance.id,
        after: {
          personName: person.name,
          leaveType: leaveType.name,
          year,
          allocated,
        },
      });
    });
    deferAudit(auditEntries);
    revalidatePath("/leave");
  });
}
