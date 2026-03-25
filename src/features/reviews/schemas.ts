import { z } from "zod";
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/schemas/shared";

export const MAX_QUESTION_TEXT_LENGTH = 500;

export const ReviewQuestionSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(MAX_QUESTION_TEXT_LENGTH),
  type: z.enum(["RATING", "TEXT"]),
  scaleMin: z.number().int().min(1).max(5).nullable(),
  scaleMax: z.number().int().min(2).max(10).nullable(),
  order: z.number().int().min(0),
  required: z.boolean(),
});

export type ReviewQuestion = z.infer<typeof ReviewQuestionSchema>;

export const ReviewTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).nullable(),
  questions: z.array(ReviewQuestionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ReviewTemplate = z.infer<typeof ReviewTemplateSchema>;

export const ReviewCycleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  templateId: z.string().uuid().nullable(),
  templateName: z.string().nullable(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]),
  startDate: z.date(),
  endDate: z.date(),
  requestCount: z.number().int(),
  submittedCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ReviewCycle = z.infer<typeof ReviewCycleSchema>;

export const ReviewRequestSchema = z.object({
  id: z.string().uuid(),
  cycleId: z.string().uuid(),
  cycleName: z.string(),
  cycleStatus: z.enum(["DRAFT", "OPEN", "CLOSED"]),
  subjectId: z.string().uuid().nullable(),
  subjectName: z.string().nullable(),
  reviewerId: z.string().uuid().nullable(),
  reviewerName: z.string().nullable(),
  type: z.enum(["SELF", "MANAGER", "PEER", "DIRECT_REPORT"]),
  status: z.enum(["PENDING", "SUBMITTED"]),
  createdAt: z.date(),
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

export const ReviewAnswerSchema = z.object({
  questionId: z.string().uuid(),
  ratingValue: z.number().int().min(1).max(10).nullable(),
  textValue: z.string().max(2000).nullable(),
});

export type ReviewAnswer = z.infer<typeof ReviewAnswerSchema>;

export const ReviewSubmissionSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  answers: z.array(ReviewAnswerSchema),
  submittedAt: z.date(),
});

export type ReviewSubmission = z.infer<typeof ReviewSubmissionSchema>;

export const TeamReviewRequestSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  status: z.string(),
  reviewerId: z.string().uuid().nullable(),
  reviewerName: z.string().nullable(),
});

export type TeamReviewRequest = z.infer<typeof TeamReviewRequestSchema>;

export const TeamReviewReportSchema = z.object({
  subjectId: z.string().uuid(),
  subjectName: z.string(),
  requests: z.array(TeamReviewRequestSchema),
});

export type TeamReviewReport = z.infer<typeof TeamReviewReportSchema>;

export const TeamReviewCycleSchema = z.object({
  cycleId: z.string().uuid(),
  cycleName: z.string(),
  cycleStatus: z.enum(["DRAFT", "OPEN", "CLOSED"]),
  reports: z.array(TeamReviewReportSchema),
});

export type TeamReviewCycle = z.infer<typeof TeamReviewCycleSchema>;
