import { z } from "zod";
import { AuditActionSchema, AuditEntityTypeSchema } from "@/features/audit/schemas";

export const DashboardTeamSizeSchema = z.object({
  teamName: z.string(),
  memberCount: z.number().int(),
});

export const DashboardDepartmentSizeSchema = z.object({
  departmentName: z.string(),
  teamCount: z.number().int(),
});

export const DashboardGrowthPointSchema = z.object({
  date: z.string(),
  persons: z.number().int(),
  teams: z.number().int(),
  departments: z.number().int(),
});

export const DashboardRecentActivitySchema = z.object({
  action: AuditActionSchema,
  entityType: AuditEntityTypeSchema,
  userEmail: z.string().nullable(),
  createdAt: z.date(),
});

export const DashboardMetricsSchema = z.object({
  totalPersons: z.number().int(),
  totalTeams: z.number().int(),
  totalDepartments: z.number().int(),
  totalUsers: z.number().int(),
  teamSizes: z.array(DashboardTeamSizeSchema),
  departmentSizes: z.array(DashboardDepartmentSizeSchema),
  growthTimeline: z.array(DashboardGrowthPointSchema),
  recentActivity: z.array(DashboardRecentActivitySchema),
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
export type DashboardTeamSize = z.infer<typeof DashboardTeamSizeSchema>;
export type DashboardDepartmentSize = z.infer<typeof DashboardDepartmentSizeSchema>;
export type DashboardGrowthPoint = z.infer<typeof DashboardGrowthPointSchema>;
export type DashboardRecentActivity = z.infer<typeof DashboardRecentActivitySchema>;
