"use server";
// Review templates and their questions.
import { revalidatePath } from "next/cache";
import { ActionError } from "@/actionErrors";
import { getDemoSessionId } from "@/demoSession";
import { MAX_NAME_LENGTH } from "@/schemas/shared";
import { type ReviewQuestion, MAX_QUESTION_TEXT_LENGTH } from "../schemas";
import { type ActionResult } from "@/lib/actionUtils";
import { guardedAction } from "@/lib/guardedAction";
import { withAuditedTransaction } from "@/lib/auditedTransaction";

export const createReviewTemplate: (data: FormData) => Promise<ActionResult> = guardedAction(
  "review:manage",
  "createReviewTemplate",
  async (t, data: FormData) => {
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
    await withAuditedTransaction(async (tx, addAudit) => {
      const template = await tx.reviewTemplate.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          questions: [],
          sessionId,
        },
      });

      addAudit({
        action: "create",
        entityType: "reviewTemplate",
        entityId: template.id,
        after: { name: template.name },
      });
    });
    revalidatePath("/reviews/templates");
    revalidatePath("/reviews");
  },
);

export const deleteReviewTemplate: (data: FormData) => Promise<ActionResult> = guardedAction(
  "review:manage",
  "deleteReviewTemplate",
  async (t, data: FormData) => {
    const templateId = data.get("templateId");
    if (typeof templateId !== "string" || !templateId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
      const template = await tx.reviewTemplate.findFirst({
        where: { id: templateId, deletedAt: null, sessionId },
      });
      if (!template) throw new ActionError("reviewTemplateNotFound", t("reviewTemplateNotFound"));

      await tx.reviewTemplate.update({
        where: { id: templateId },
        data: { deletedAt: new Date() },
      });

      addAudit({
        action: "delete",
        entityType: "reviewTemplate",
        entityId: templateId,
        before: { name: template.name },
      });
    });
    revalidatePath("/reviews/templates");
    revalidatePath("/reviews");
  },
);

export const addReviewQuestion: (data: FormData) => Promise<ActionResult> = guardedAction(
  "review:manage",
  "addReviewQuestion",
  async (t, data: FormData) => {
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
    if (text.trim().length > MAX_QUESTION_TEXT_LENGTH) {
      throw new ActionError("nameTooLong", t("nameTooLong", { max: MAX_QUESTION_TEXT_LENGTH }));
    }
    if (type !== "RATING" && type !== "TEXT") {
      throw new ActionError("invalidQuestionType", t("invalidQuestionType"));
    }

    const scaleMin = scaleMinRaw ? parseInt(String(scaleMinRaw), 10) : null;
    const scaleMax = scaleMaxRaw ? parseInt(String(scaleMaxRaw), 10) : null;
    const required = requiredRaw !== "false";

    if (type === "RATING") {
      const min = scaleMin ?? 1;
      const max = scaleMax ?? 5;
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 10 || min >= max) {
        throw new ActionError("ratingOutOfRange", t("ratingOutOfRange"));
      }
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
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

      addAudit({
        action: "update",
        entityType: "reviewTemplate",
        entityId: templateId,
        after: { addedQuestion: newQuestion.text },
      });
    });
    revalidatePath(`/reviews/templates/${templateId}`);
  },
);

export const removeReviewQuestion: (data: FormData) => Promise<ActionResult> = guardedAction(
  "review:manage",
  "removeReviewQuestion",
  async (t, data: FormData) => {
    const templateId = data.get("templateId");
    const questionId = data.get("questionId");

    if (typeof templateId !== "string" || !templateId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }
    if (typeof questionId !== "string" || !questionId.trim()) {
      throw new ActionError("unexpectedError", t("unexpectedError"));
    }

    const sessionId = await getDemoSessionId();
    await withAuditedTransaction(async (tx, addAudit) => {
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

      addAudit({
        action: "update",
        entityType: "reviewTemplate",
        entityId: templateId,
        after: { removedQuestion: questionId },
      });
    });
    revalidatePath(`/reviews/templates/${templateId}`);
  },
);
