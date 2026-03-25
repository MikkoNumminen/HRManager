import { z } from "zod";

export const ReportFiltersSchema = z.object({
  departmentId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  year: z.number().int().min(2000).max(2100).optional(),
});

export type ReportFilters = z.infer<typeof ReportFiltersSchema>;

export const HeadcountTrendSchema = z.object({
  month: z.string(),
  departmentName: z.string(),
  hired: z.number().int(),
  departed: z.number().int(),
  runningHeadcount: z.number().int(),
});

export type HeadcountTrend = z.infer<typeof HeadcountTrendSchema>;

export const TurnoverRateSchema = z.object({
  month: z.string(),
  departmentName: z.string(),
  startCount: z.number().int(),
  departedCount: z.number().int(),
  turnoverPct: z.number(),
});

export type TurnoverRate = z.infer<typeof TurnoverRateSchema>;

export const LeaveUtilizationSchema = z.object({
  departmentName: z.string(),
  leaveTypeName: z.string(),
  leaveTypeColor: z.string(),
  totalAllocated: z.number().int(),
  totalUsed: z.number().int(),
  totalRemaining: z.number().int(),
  utilizationPct: z.number(),
});

export type LeaveUtilization = z.infer<typeof LeaveUtilizationSchema>;

export const ReviewCompletionSchema = z.object({
  cycleName: z.string(),
  cycleStatus: z.string(),
  totalRequests: z.number().int(),
  submittedCount: z.number().int(),
  completionPct: z.number(),
});

export type ReviewCompletion = z.infer<typeof ReviewCompletionSchema>;

export const OrgChartMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  position: z.string().nullable(),
  email: z.string().nullable(),
});

export type OrgChartMember = z.infer<typeof OrgChartMemberSchema>;

export const OrgChartTeamSchema = z.object({
  teamId: z.string().uuid(),
  teamName: z.string(),
  managerId: z.string().uuid().nullable(),
  managerName: z.string().nullable(),
  members: z.array(OrgChartMemberSchema),
});

export type OrgChartTeam = z.infer<typeof OrgChartTeamSchema>;

export const OrgChartDepartmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  headId: z.string().uuid().nullable(),
  headName: z.string().nullable(),
  teams: z.array(OrgChartTeamSchema),
});

export type OrgChartDepartment = z.infer<typeof OrgChartDepartmentSchema>;

export const OrgChartDataSchema = z.object({
  departments: z.array(OrgChartDepartmentSchema),
  unassignedTeams: z.array(OrgChartTeamSchema),
  unassignedPersons: z.array(OrgChartMemberSchema),
});

export type OrgChartData = z.infer<typeof OrgChartDataSchema>;
