import { z } from "zod";
import { MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH } from "@/schemas/shared";

export const MAX_LEAVE_NOTE_LENGTH = 500;

export const LeaveRequestStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const LeaveTypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).nullable(),
  defaultDays: z.number().int().min(0),
  color: z.string().max(7),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LeaveType = z.infer<typeof LeaveTypeSchema>;

export const LeaveRequestSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid(),
  personName: z.string(),
  leaveTypeId: z.string().uuid(),
  leaveTypeName: z.string(),
  leaveTypeColor: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  days: z.number().int().min(1),
  note: z.string().max(MAX_LEAVE_NOTE_LENGTH).nullable(),
  status: LeaveRequestStatusSchema,
  reviewerId: z.string().uuid().nullable(),
  reviewerName: z.string().nullable(),
  reviewNote: z.string().max(MAX_LEAVE_NOTE_LENGTH).nullable(),
  reviewedAt: z.date().nullable(),
  createdAt: z.date(),
});

export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;

export const LeaveBalanceSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid(),
  personName: z.string(),
  leaveTypeId: z.string().uuid(),
  leaveTypeName: z.string(),
  leaveTypeColor: z.string(),
  year: z.number().int(),
  allocated: z.number().int().min(0),
  used: z.number().int().min(0),
  remaining: z.number().int(),
});

export type LeaveBalance = z.infer<typeof LeaveBalanceSchema>;
