export const PAGE_SIZE = 25;
export const DEMO_EMAIL = "demo@hrmanager.app";

/**
 * Whether the zero-credential demo login provider is enabled.
 *
 * Opt-in by design: only the exact string "true" enables it, so a deployment
 * that forgets the variable never ships a one-click superuser login. Read at
 * call time (not at module load) so tests and runtime env changes are honored.
 * The NEXT_PUBLIC_ prefix lets the client gate the demo button to match the server.
 */
export function isDemoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";
}

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
