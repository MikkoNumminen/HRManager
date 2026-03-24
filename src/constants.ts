export const PAGE_SIZE = 25;
export const DEMO_EMAIL = "demo@hrmanager.app";

export interface PersonDeleteImpact {
  managedTeams: { teamId: string; teamName: string }[];
  headedDepartments: { id: string; name: string }[];
  teamMemberships: { teamId: string; teamName: string }[];
  leaveRequests: number;
  reviewRequests: number;
}

export interface TeamDeleteImpact {
  memberCount: number;
  departmentName: string | null;
}

export interface DepartmentDeleteImpact {
  teams: { teamId: string; teamName: string }[];
}
