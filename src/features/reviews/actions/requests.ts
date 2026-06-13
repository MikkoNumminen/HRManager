"use server";
// Review requests and submissions: assignment, removal, and answer submission.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { type ReviewQuestion, ReviewAnswerSchema } from "../schemas";
import { type ActionResult, validateUUID } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";

export const addReviewRequest: (data: FormData) => Promise<ActionResult> = guardedAction(
  "review:manage",
  "addReviewRequest",
  async (t, data: FormData) => {
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
    validateUUID(cycleId, "cycleId");
    validateUUID(subjectId, "subjectId");
    validateUUID(reviewerId, "reviewerId");

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
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

      addAudit({
        action: "create",
        entityType: "reviewRequest",
        entityId: req.id,
        after: { cycleId, type },
      });
    });
    revalidatePath(`/reviews/cycles/${cycleId}`);
  },
);

export const removeReviewRequest: (data: FormData) => Promise<ActionResult> = guardedAction(
  "review:manage",
  "removeReviewRequest",
  async (t, data: FormData) => {
    const requestId = data.get("requestId");
    const cycleId = data.get("cycleId");

    if (typeof requestId !== "string" || !requestId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const req = await tx.reviewRequest.findFirst({
        where: { id: requestId, sessionId },
      });
      if (!req) throw new ActionError("reviewRequestNotFound", t("reviewRequestNotFound"));
      // A submitted request owns a ReviewSubmission and the FK is onDelete: Cascade,
      // so deleting it would silently destroy the submitted answers. Refuse instead.
      if (req.status === "SUBMITTED") {
        throw new ActionError("reviewAlreadySubmitted", t("reviewAlreadySubmitted"));
      }

      await tx.reviewRequest.delete({ where: { id: requestId } });

      addAudit({
        action: "delete",
        entityType: "reviewRequest",
        entityId: requestId,
        before: { type: req.type, status: req.status },
      });
    });
    if (typeof cycleId === "string" && cycleId.trim()) {
      revalidatePath(`/reviews/cycles/${cycleId}`);
    }
  },
);

export const submitReview: (data: FormData) => Promise<ActionResult> = guardedAction(
  "review:submit",
  "submitReview",
  async (t, data: FormData) => {
    const requestId = data.get("requestId");
    const answersRaw = data.get("answers");

    if (typeof requestId !== "string" || !requestId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    let rawAnswers: unknown = [];
    if (typeof answersRaw === "string") {
      try {
        rawAnswers = JSON.parse(answersRaw);
      } catch {
        throw new ActionError("unexpectedError", t("unexpectedError"));
      }
    }
    // Validate shape before persisting to the JSON column: UUID questionIds,
    // ratings 1-10, text <= 2000 chars, unknown keys stripped, count capped.
    const parsedAnswers = z.array(ReviewAnswerSchema).max(200).safeParse(rawAnswers);
    if (!parsedAnswers.success) throw new ActionError("ratingOutOfRange", t("ratingOutOfRange"));
    const answers = parsedAnswers.data;

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const req = await tx.reviewRequest.findFirst({
        where: { id: requestId, sessionId },
        include: { cycle: true },
      });
      if (!req) throw new ActionError("reviewRequestNotFound", t("reviewRequestNotFound"));
      if (req.status === "SUBMITTED")
        throw new ActionError("reviewAlreadySubmitted", t("reviewAlreadySubmitted"));
      if (req.cycle.status !== "OPEN")
        throw new ActionError("reviewCycleNotOpen", t("reviewCycleNotOpen"));

      // Cross-check answers against the cycle's template: each answer must target a
      // real question, and every required question must be answered.
      const template = req.cycle.templateId
        ? await tx.reviewTemplate.findFirst({ where: { id: req.cycle.templateId, sessionId } })
        : null;
      const questions = Array.isArray(template?.questions)
        ? (template!.questions as ReviewQuestion[])
        : [];
      const questionIds = new Set(questions.map((q) => q.id));
      const answeredIds = new Set(answers.map((a) => a.questionId));
      // Only cross-check membership when the cycle has a template defining questions.
      if (questions.length > 0) {
        for (const a of answers) {
          if (!questionIds.has(a.questionId)) {
            throw new ActionError("unexpectedError", t("unexpectedError"));
          }
        }
      }
      for (const q of questions) {
        if (q.required && !answeredIds.has(q.id)) {
          throw new ActionError("answerRequired", t("answerRequired"));
        }
      }

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

      addAudit({
        action: "create",
        entityType: "reviewSubmission",
        entityId: submission.id,
        after: { requestId, answerCount: answers.length },
      });
    });
    revalidatePath("/reviews/my-reviews");
    revalidatePath(`/reviews/cycles/${data.get("cycleId")}`);
  },
);
