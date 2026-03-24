"use server";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/permissions";
import { captureAuditContext, deferAudit, DeferredAuditEntry } from "@/auditLog";
import { rateLimit } from "@/rateLimit";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_NAME_LENGTH, type ReviewQuestion } from "@/schemas";
import { getTranslations } from "next-intl/server";
import { safe, type ActionResult } from "./_shared";

export async function createReviewTemplate(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("createReviewTemplate");

    const name = data.get("name");
    const description = data.get("description");

    if (typeof name !== "string" || name.trim().length === 0) {
      throw new ActionError("invalidName", t("invalidName"));
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_NAME_LENGTH }));
    }
    if (description !== null && typeof description !== "string") {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const template = await tx.reviewTemplate.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          questions: [],
          sessionId,
        },
      });

      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "reviewTemplate",
        entityId: template.id,
        after: { name: template.name },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/reviews/templates");
    revalidatePath("/reviews");
  });
}

export async function deleteReviewTemplate(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("deleteReviewTemplate");

    const templateId = data.get("templateId");
    if (typeof templateId !== "string" || !templateId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const template = await tx.reviewTemplate.findFirst({
        where: { id: templateId, deletedAt: null, sessionId },
      });
      if (!template) throw new ActionError("reviewTemplateNotFound", t("reviewTemplateNotFound"));

      await tx.reviewTemplate.update({
        where: { id: templateId },
        data: { deletedAt: new Date() },
      });

      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "reviewTemplate",
        entityId: templateId,
        before: { name: template.name },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/reviews/templates");
    revalidatePath("/reviews");
  });
}

export async function addReviewQuestion(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("addReviewQuestion");

    const templateId = data.get("templateId");
    const text = data.get("text");
    const type = data.get("type");
    const scaleMinRaw = data.get("scaleMin");
    const scaleMaxRaw = data.get("scaleMax");
    const requiredRaw = data.get("required");

    if (typeof templateId !== "string" || !templateId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new ActionError("invalidName", t("invalidName"));
    }
    if (type !== "RATING" && type !== "TEXT") {
      throw new ActionError("invalidQuestionType", t("invalidQuestionType"));
    }

    const scaleMin = scaleMinRaw ? parseInt(String(scaleMinRaw), 10) : null;
    const scaleMax = scaleMaxRaw ? parseInt(String(scaleMaxRaw), 10) : null;
    const required = requiredRaw !== "false";

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const template = await tx.reviewTemplate.findFirst({
        where: { id: templateId, deletedAt: null, sessionId },
      });
      if (!template) throw new ActionError("reviewTemplateNotFound", t("reviewTemplateNotFound"));

      const existingQuestions = Array.isArray(template.questions)
        ? (template.questions as ReviewQuestion[])
        : [];
      const newQuestion: ReviewQuestion = {
        id: crypto.randomUUID(),
        text: text.trim(),
        type: type as "RATING" | "TEXT",
        scaleMin: type === "RATING" ? (scaleMin ?? 1) : null,
        scaleMax: type === "RATING" ? (scaleMax ?? 5) : null,
        order: existingQuestions.length,
        required,
      };

      await tx.reviewTemplate.update({
        where: { id: templateId },
        data: { questions: [...existingQuestions, newQuestion] },
      });

      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "reviewTemplate",
        entityId: templateId,
        after: { addedQuestion: newQuestion.text },
      });
    });

    deferAudit(auditEntries);
    revalidatePath(`/reviews/templates/${templateId}`);
  });
}

export async function removeReviewQuestion(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("removeReviewQuestion");

    const templateId = data.get("templateId");
    const questionId = data.get("questionId");

    if (typeof templateId !== "string" || !templateId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }
    if (typeof questionId !== "string" || !questionId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const template = await tx.reviewTemplate.findFirst({
        where: { id: templateId, deletedAt: null, sessionId },
      });
      if (!template) throw new ActionError("reviewTemplateNotFound", t("reviewTemplateNotFound"));

      const existingQuestions = Array.isArray(template.questions)
        ? (template.questions as ReviewQuestion[])
        : [];
      const filtered = existingQuestions
        .filter((q) => q.id !== questionId)
        .map((q, i) => ({ ...q, order: i }));

      await tx.reviewTemplate.update({
        where: { id: templateId },
        data: { questions: filtered },
      });

      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "reviewTemplate",
        entityId: templateId,
        after: { removedQuestion: questionId },
      });
    });

    deferAudit(auditEntries);
    revalidatePath(`/reviews/templates/${templateId}`);
  });
}

export async function createReviewCycle(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("createReviewCycle");

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

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
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

      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "reviewCycle",
        entityId: cycle.id,
        after: { name: cycle.name, status: cycle.status },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/reviews");
  });
}

export async function deleteReviewCycle(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("deleteReviewCycle");

    const cycleId = data.get("cycleId");
    if (typeof cycleId !== "string" || !cycleId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const cycle = await tx.reviewCycle.findFirst({
        where: { id: cycleId, deletedAt: null, sessionId },
      });
      if (!cycle) throw new ActionError("reviewCycleNotFound", t("reviewCycleNotFound"));

      await tx.reviewCycle.update({
        where: { id: cycleId },
        data: { deletedAt: new Date() },
      });

      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "reviewCycle",
        entityId: cycleId,
        before: { name: cycle.name, status: cycle.status },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/reviews");
  });
}

export async function openReviewCycle(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("openReviewCycle");

    const cycleId = data.get("cycleId");
    if (typeof cycleId !== "string" || !cycleId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
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

      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "reviewCycle",
        entityId: cycleId,
        before: { status: "DRAFT" },
        after: { status: "OPEN" },
      });
    });

    deferAudit(auditEntries);
    revalidatePath(`/reviews/cycles/${cycleId}`);
    revalidatePath("/reviews");
  });
}

export async function closeReviewCycle(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("closeReviewCycle");

    const cycleId = data.get("cycleId");
    if (typeof cycleId !== "string" || !cycleId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
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

      auditEntries.push({
        ...ctx,
        action: "update",
        entityType: "reviewCycle",
        entityId: cycleId,
        before: { status: "OPEN" },
        after: { status: "CLOSED" },
      });
    });

    deferAudit(auditEntries);
    revalidatePath(`/reviews/cycles/${cycleId}`);
    revalidatePath("/reviews");
  });
}

export async function addReviewRequest(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("addReviewRequest");

    const cycleId = data.get("cycleId");
    const subjectId = data.get("subjectId");
    const reviewerId = data.get("reviewerId");
    const type = data.get("type");

    if (typeof cycleId !== "string" || !cycleId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }
    if (typeof subjectId !== "string" || !subjectId.trim()) {
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    }
    if (typeof reviewerId !== "string" || !reviewerId.trim()) {
      throw new ActionError("noPersonSelected", t("noPersonSelected"));
    }
    if (!["SELF", "MANAGER", "PEER", "DIRECT_REPORT"].includes(String(type))) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const cycle = await tx.reviewCycle.findFirst({
        where: { id: cycleId, deletedAt: null, sessionId },
      });
      if (!cycle) throw new ActionError("reviewCycleNotFound", t("reviewCycleNotFound"));

      const existing = await tx.reviewRequest.findUnique({
        where: {
          cycleId_subjectId_reviewerId_type: {
            cycleId,
            subjectId,
            reviewerId,
            type: type as "SELF" | "MANAGER" | "PEER" | "DIRECT_REPORT",
          },
        },
      });
      if (existing) throw new ActionError("reviewAlreadyExists", t("reviewAlreadyExists"));

      const req = await tx.reviewRequest.create({
        data: {
          cycleId,
          subjectId,
          reviewerId,
          type: type as "SELF" | "MANAGER" | "PEER" | "DIRECT_REPORT",
          status: "PENDING",
          sessionId,
        },
      });

      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "reviewRequest",
        entityId: req.id,
        after: { cycleId, type },
      });
    });

    deferAudit(auditEntries);
    revalidatePath(`/reviews/cycles/${cycleId}`);
  });
}

export async function removeReviewRequest(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:manage");
    await rateLimit("removeReviewRequest");

    const requestId = data.get("requestId");
    const cycleId = data.get("cycleId");

    if (typeof requestId !== "string" || !requestId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const req = await tx.reviewRequest.findFirst({
        where: { id: requestId, sessionId },
      });
      if (!req) throw new ActionError("reviewRequestNotFound", t("reviewRequestNotFound"));

      await tx.reviewRequest.delete({ where: { id: requestId } });

      auditEntries.push({
        ...ctx,
        action: "delete",
        entityType: "reviewRequest",
        entityId: requestId,
        before: { type: req.type, status: req.status },
      });
    });

    deferAudit(auditEntries);
    if (typeof cycleId === "string" && cycleId.trim()) {
      revalidatePath(`/reviews/cycles/${cycleId}`);
    }
  });
}

export async function submitReview(data: FormData): Promise<ActionResult> {
  return safe(async () => {
    const t = await getTranslations("errors");
    await requirePermission("review:submit");
    await rateLimit("submitReview");

    const requestId = data.get("requestId");
    const answersRaw = data.get("answers");

    if (typeof requestId !== "string" || !requestId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    let answers: Array<{
      questionId: string;
      ratingValue: number | null;
      textValue: string | null;
    }> = [];
    if (typeof answersRaw === "string") {
      try {
        answers = JSON.parse(answersRaw);
      } catch {
        throw new ActionError("unexpectedError", t("unexpectedError"));
      }
    }

    const sessionId = await getDemoSessionId();
    const ctx = await captureAuditContext();
    const auditEntries: DeferredAuditEntry[] = [];

    await prisma.$transaction(async (tx) => {
      const req = await tx.reviewRequest.findFirst({
        where: { id: requestId, sessionId },
        include: { cycle: true },
      });
      if (!req) throw new ActionError("reviewRequestNotFound", t("reviewRequestNotFound"));
      if (req.status === "SUBMITTED")
        throw new ActionError("reviewAlreadySubmitted", t("reviewAlreadySubmitted"));
      if (req.cycle.status !== "OPEN")
        throw new ActionError("reviewCycleNotOpen", t("reviewCycleNotOpen"));

      const submission = await tx.reviewSubmission.create({
        data: {
          requestId,
          answers,
          sessionId,
        },
      });

      await tx.reviewRequest.update({
        where: { id: requestId },
        data: { status: "SUBMITTED" },
      });

      auditEntries.push({
        ...ctx,
        action: "create",
        entityType: "reviewSubmission",
        entityId: submission.id,
        after: { requestId, answerCount: answers.length },
      });
    });

    deferAudit(auditEntries);
    revalidatePath("/reviews/my-reviews");
    revalidatePath(`/reviews/cycles/${data.get("cycleId")}`);
  });
}
