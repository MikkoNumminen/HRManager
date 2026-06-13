"use server";
// Review cycles: create, delete, and lifecycle transitions (open / close).
import { revalidatePath } from "next/cache";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_NAME_LENGTH } from "@/schemas/shared";
import { type ActionResult, validateUUID } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";

export const createReviewCycle: (data: FormData) => Promise<ActionResult> = guardedAction(
  "review:manage",
  "createReviewCycle",
  async (t, data: FormData) => {
    const name = data.get("name");
    const templateId = data.get("templateId");
    const startDateRaw = data.get("startDate");
    const endDateRaw = data.get("endDate");

    if (typeof name !== "string" || name.trim().length === 0) {
      throw new ActionError("invalidName", t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }

    const startDate = startDateRaw ? new Date(String(startDateRaw)) : null;
    const endDate = endDateRaw ? new Date(String(endDateRaw)) : null;
    if (!startDate || isNaN(startDate.getTime())) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }
    if (!endDate || isNaN(endDate.getTime())) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const resolvedTemplateId =
      typeof templateId === "string" && templateId.trim() ? templateId.trim() : null;
    if (resolvedTemplateId) validateUUID(resolvedTemplateId, "templateId");

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      if (resolvedTemplateId) {
        const tpl = await tx.reviewTemplate.findFirst({
          where: { id: resolvedTemplateId, deletedAt: null, sessionId },
        });
        if (!tpl) throw new ActionError("reviewTemplateNotFound", t("reviewTemplateNotFound"));
      }

      const cycle = await tx.reviewCycle.create({
        data: {
          name: name.trim(),
          templateId: resolvedTemplateId,
          startDate,
          endDate,
          status: "DRAFT",
          sessionId,
        },
      });

      addAudit({
        action: "create",
        entityType: "reviewCycle",
        entityId: cycle.id,
        after: { name: cycle.name, status: cycle.status },
      });
    });
    revalidatePath("/reviews");
  },
);

export const deleteReviewCycle: (data: FormData) => Promise<ActionResult> = guardedAction(
  "review:manage",
  "deleteReviewCycle",
  async (t, data: FormData) => {
    const cycleId = data.get("cycleId");
    if (typeof cycleId !== "string" || !cycleId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const cycle = await tx.reviewCycle.findFirst({
        where: { id: cycleId, deletedAt: null, sessionId },
      });
      if (!cycle) throw new ActionError("reviewCycleNotFound", t("reviewCycleNotFound"));

      await tx.reviewCycle.update({
        where: { id: cycleId },
        data: { deletedAt: new Date() },
      });

      addAudit({
        action: "delete",
        entityType: "reviewCycle",
        entityId: cycleId,
        before: { name: cycle.name, status: cycle.status },
      });
    });
    revalidatePath("/reviews");
  },
);

export const openReviewCycle: (data: FormData) => Promise<ActionResult> = guardedAction(
  "review:manage",
  "openReviewCycle",
  async (t, data: FormData) => {
    const cycleId = data.get("cycleId");
    if (typeof cycleId !== "string" || !cycleId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const cycle = await tx.reviewCycle.findFirst({
        where: { id: cycleId, deletedAt: null, sessionId },
      });
      if (!cycle) throw new ActionError("reviewCycleNotFound", t("reviewCycleNotFound"));
      if (cycle.status !== "DRAFT")
        throw new ActionError("reviewCycleNotDraft", t("reviewCycleNotDraft"));

      await tx.reviewCycle.update({
        where: { id: cycleId },
        data: { status: "OPEN" },
      });

      addAudit({
        action: "update",
        entityType: "reviewCycle",
        entityId: cycleId,
        before: { status: "DRAFT" },
        after: { status: "OPEN" },
      });
    });
    revalidatePath(`/reviews/cycles/${cycleId}`);
    revalidatePath("/reviews");
  },
);

export const closeReviewCycle: (data: FormData) => Promise<ActionResult> = guardedAction(
  "review:manage",
  "closeReviewCycle",
  async (t, data: FormData) => {
    const cycleId = data.get("cycleId");
    if (typeof cycleId !== "string" || !cycleId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const cycle = await tx.reviewCycle.findFirst({
        where: { id: cycleId, deletedAt: null, sessionId },
      });
      if (!cycle) throw new ActionError("reviewCycleNotFound", t("reviewCycleNotFound"));
      if (cycle.status === "CLOSED")
        throw new ActionError("reviewCycleAlreadyClosed", t("reviewCycleAlreadyClosed"));
      if (cycle.status !== "OPEN")
        throw new ActionError("reviewCycleNotOpen", t("reviewCycleNotOpen"));

      await tx.reviewCycle.update({
        where: { id: cycleId },
        data: { status: "CLOSED" },
      });

      addAudit({
        action: "update",
        entityType: "reviewCycle",
        entityId: cycleId,
        before: { status: "OPEN" },
        after: { status: "CLOSED" },
      });
    });
    revalidatePath(`/reviews/cycles/${cycleId}`);
    revalidatePath("/reviews");
  },
);
