/**
 * Shared seed data definitions — single source of truth for demo sessions
 * and admin-triggered mock data seeding. Both demoSession.ts and
 * features/admin/actions.ts import from here instead of defining inline.
 */

export interface PersonSeed {
  name: string;
  position: string;
  email: string;
}

export interface TeamSeed {
  teamName: string;
  /** Index into PERSON_SEEDS for the manager */
  managerIndex: number;
}

export interface MembershipSeed {
  /** Index into PERSON_SEEDS */
  personIndex: number;
  /** Index into TEAM_SEEDS */
  teamIndex: number;
}

export interface DepartmentSeed {
  name: string;
  description: string;
  /** Index into PERSON_SEEDS for the department head */
  headIndex: number;
  /** Team names to assign to this department */
  teamNames: string[];
}

export interface LeaveTypeSeed {
  name: string;
  description: string;
  defaultDays: number;
  color: string;
}

// ─── Person Seeds ────────────────────────────────────────────────────
export const PERSON_SEEDS: PersonSeed[] = [
  { name: "Alice Johnson", position: "Engineering Manager", email: "alice@example.com" },
  { name: "Bob Williams", position: "Senior Developer", email: "bob@example.com" },
  { name: "Carol Davis", position: "UX Designer", email: "carol@example.com" },
  { name: "Dave Martinez", position: "Backend Developer", email: "dave@example.com" },
  { name: "Eve Thompson", position: "QA Engineer", email: "eve@example.com" },
  { name: "Frank Lee", position: "Product Owner", email: "frank@example.com" },
  { name: "Grace Park", position: "DevOps Lead", email: "grace@example.com" },
  { name: "Henry Chen", position: "Data Analyst", email: "henry@example.com" },
  { name: "Ivy Santos", position: "HR Coordinator", email: "ivy@example.com" },
];

// Named indices for readability
const ALICE = 0;
const BOB = 1;
const CAROL = 2;
const DAVE = 3;
const EVE = 4;
const FRANK = 5;
const GRACE = 6;
const HENRY = 7;
const IVY = 8;

// ─── Team Seeds ──────────────────────────────────────────────────────
export const TEAM_SEEDS: TeamSeed[] = [
  { teamName: "Engineering", managerIndex: ALICE },
  { teamName: "Design", managerIndex: CAROL },
  { teamName: "Platform", managerIndex: GRACE },
  { teamName: "Data Analytics", managerIndex: HENRY },
  { teamName: "People & Culture", managerIndex: IVY },
];

// ─── Membership Seeds ────────────────────────────────────────────────
// [personIndex, teamIndex] pairs
const ENG = 0;
const DESIGN = 1;
const PLATFORM = 2;
const DATA = 3;
const PEOPLE = 4;

export const MEMBERSHIP_SEEDS: MembershipSeed[] = [
  { personIndex: ALICE, teamIndex: ENG },
  { personIndex: BOB, teamIndex: ENG },
  { personIndex: DAVE, teamIndex: ENG },
  { personIndex: EVE, teamIndex: ENG },
  { personIndex: CAROL, teamIndex: DESIGN },
  { personIndex: FRANK, teamIndex: DESIGN },
  { personIndex: GRACE, teamIndex: PLATFORM },
  { personIndex: DAVE, teamIndex: PLATFORM },
  { personIndex: HENRY, teamIndex: DATA },
  { personIndex: IVY, teamIndex: PEOPLE },
];

// ─── Department Seeds ────────────────────────────────────────────────
export const DEPARTMENT_SEEDS: DepartmentSeed[] = [
  {
    name: "Engineering",
    description: "Software development and infrastructure",
    headIndex: ALICE,
    teamNames: ["Engineering", "Platform"],
  },
  {
    name: "Product & Design",
    description: "Product management, UX, and design",
    headIndex: FRANK,
    teamNames: ["Design"],
  },
  {
    name: "Data",
    description: "Analytics, reporting, and data engineering",
    headIndex: HENRY,
    teamNames: ["Data Analytics"],
  },
  {
    name: "Human Resources",
    description: "People operations and talent management",
    headIndex: IVY,
    teamNames: ["People & Culture"],
  },
];

// ─── Leave Type Seeds ────────────────────────────────────────────────
export const LEAVE_TYPE_SEEDS: LeaveTypeSeed[] = [
  {
    name: "Annual Leave",
    description: "Paid annual vacation days",
    defaultDays: 25,
    color: "#4caf50",
  },
  { name: "Sick Leave", description: "Paid sick days", defaultDays: 10, color: "#f44336" },
  {
    name: "Parental Leave",
    description: "Maternity or paternity leave",
    defaultDays: 90,
    color: "#9c27b0",
  },
  {
    name: "Unpaid Leave",
    description: "Leave without pay",
    defaultDays: 0,
    color: "#757575",
  },
];
