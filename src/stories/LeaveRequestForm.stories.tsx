/**
 * Stories for LeaveManager — covers requests tab (with and without data),
 * empty leave types, admin view (all tabs visible), and read-only view.
 *
 * Server actions (createLeaveRequest, reviewLeaveRequest, etc.) are not
 * called in static stories; forms render but submissions are no-ops.
 */
import type { Meta, StoryObj } from "@storybook/react";
import LeaveManager from "@/components/LeaveManager";
import type { LeaveType, LeaveRequest, LeaveBalance, Person, Permissions } from "@/schemas";

const meta: Meta<typeof LeaveManager> = {
  title: "Components/LeaveManager",
  component: LeaveManager,
  tags: ["autodocs"],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
};

export default meta;
type Story = StoryObj<typeof LeaveManager>;

// ── Fixtures ──────────────────────────────────────────────────

const LEAVE_TYPES: LeaveType[] = [
  {
    id: "lt000001-0000-0000-0000-000000000001",
    name: "Annual Leave",
    description: "Standard paid vacation days",
    defaultDays: 25,
    color: "#1976d2",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "lt000002-0000-0000-0000-000000000002",
    name: "Sick Leave",
    description: "Medical absences",
    defaultDays: 10,
    color: "#d32f2f",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: "lt000003-0000-0000-0000-000000000003",
    name: "Parental Leave",
    description: "Maternity / paternity leave",
    defaultDays: 90,
    color: "#388e3c",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
];

const PERSONS: Person[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Alice Johnson",
    position: "Senior Engineer",
    email: "alice@example.com",
    createdAt: new Date("2024-01-15T09:00:00Z"),
    updatedAt: new Date("2025-03-01T12:00:00Z"),
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Bob Martinez",
    position: "Product Manager",
    email: "bob@example.com",
    createdAt: new Date("2024-02-20T09:00:00Z"),
    updatedAt: new Date("2025-02-15T12:00:00Z"),
  },
];

const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "req00001-0000-0000-0000-000000000001",
    personId: "11111111-1111-1111-1111-111111111111",
    personName: "Alice Johnson",
    leaveTypeId: "lt000001-0000-0000-0000-000000000001",
    leaveTypeName: "Annual Leave",
    leaveTypeColor: "#1976d2",
    startDate: new Date("2026-04-07"),
    endDate: new Date("2026-04-11"),
    days: 5,
    note: "Spring vacation",
    status: "pending",
    reviewerId: null,
    reviewerName: null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: new Date("2026-03-20T10:00:00Z"),
  },
  {
    id: "req00002-0000-0000-0000-000000000002",
    personId: "22222222-2222-2222-2222-222222222222",
    personName: "Bob Martinez",
    leaveTypeId: "lt000002-0000-0000-0000-000000000002",
    leaveTypeName: "Sick Leave",
    leaveTypeColor: "#d32f2f",
    startDate: new Date("2026-03-18"),
    endDate: new Date("2026-03-19"),
    days: 2,
    note: null,
    status: "approved",
    reviewerId: "11111111-1111-1111-1111-111111111111",
    reviewerName: "Alice Johnson",
    reviewNote: null,
    reviewedAt: new Date("2026-03-17T14:30:00Z"),
    createdAt: new Date("2026-03-17T09:00:00Z"),
  },
  {
    id: "req00003-0000-0000-0000-000000000003",
    personId: "11111111-1111-1111-1111-111111111111",
    personName: "Alice Johnson",
    leaveTypeId: "lt000003-0000-0000-0000-000000000003",
    leaveTypeName: "Parental Leave",
    leaveTypeColor: "#388e3c",
    startDate: new Date("2025-06-01"),
    endDate: new Date("2025-08-29"),
    days: 65,
    note: "Newborn",
    status: "rejected",
    reviewerId: "22222222-2222-2222-2222-222222222222",
    reviewerName: "Bob Martinez",
    reviewNote: "Insufficient notice",
    reviewedAt: new Date("2025-05-01T10:00:00Z"),
    createdAt: new Date("2025-04-28T11:00:00Z"),
  },
];

const LEAVE_BALANCES: LeaveBalance[] = [
  {
    id: "bal00001-0000-0000-0000-000000000001",
    personId: "11111111-1111-1111-1111-111111111111",
    personName: "Alice Johnson",
    leaveTypeId: "lt000001-0000-0000-0000-000000000001",
    leaveTypeName: "Annual Leave",
    leaveTypeColor: "#1976d2",
    year: 2026,
    allocated: 25,
    used: 5,
    remaining: 20,
  },
  {
    id: "bal00002-0000-0000-0000-000000000002",
    personId: "22222222-2222-2222-2222-222222222222",
    personName: "Bob Martinez",
    leaveTypeId: "lt000002-0000-0000-0000-000000000002",
    leaveTypeName: "Sick Leave",
    leaveTypeColor: "#d32f2f",
    year: 2026,
    allocated: 10,
    used: 10,
    remaining: 0,
  },
];

const ADMIN_PERMISSIONS: Permissions = {
  "leave:request": true,
  "leave:approve": true,
  "leave:manage_types": true,
};

const READ_ONLY_PERMISSIONS: Permissions = {
  "leave:request": false,
  "leave:approve": false,
  "leave:manage_types": false,
};

const REQUESTER_PERMISSIONS: Permissions = {
  "leave:request": true,
  "leave:approve": false,
  "leave:manage_types": false,
};

// ── Stories ───────────────────────────────────────────────────

/** Admin view — all permissions, all requests with mixed statuses */
export const AdminWithData: Story = {
  args: {
    leaveTypes: LEAVE_TYPES,
    leaveRequests: LEAVE_REQUESTS,
    leaveBalances: LEAVE_BALANCES,
    persons: PERSONS,
    permissions: ADMIN_PERMISSIONS,
  },
};

/** No leave requests yet — shows empty message */
export const EmptyRequests: Story = {
  args: {
    leaveTypes: LEAVE_TYPES,
    leaveRequests: [],
    leaveBalances: [],
    persons: PERSONS,
    permissions: ADMIN_PERMISSIONS,
  },
};

/** Read-only user — no action buttons visible */
export const ReadOnly: Story = {
  args: {
    leaveTypes: LEAVE_TYPES,
    leaveRequests: LEAVE_REQUESTS,
    leaveBalances: LEAVE_BALANCES,
    persons: PERSONS,
    permissions: READ_ONLY_PERMISSIONS,
  },
};

/** Employee who can request but not approve */
export const RequesterOnly: Story = {
  args: {
    leaveTypes: LEAVE_TYPES,
    leaveRequests: LEAVE_REQUESTS,
    leaveBalances: LEAVE_BALANCES,
    persons: PERSONS,
    permissions: REQUESTER_PERMISSIONS,
  },
};

/** No leave types configured — all tabs show empty states */
export const NoLeaveTypes: Story = {
  args: {
    leaveTypes: [],
    leaveRequests: [],
    leaveBalances: [],
    persons: PERSONS,
    permissions: ADMIN_PERMISSIONS,
  },
};

/** Balance tab with exhausted leave — remaining shown in red */
export const ExhaustedBalance: Story = {
  args: {
    leaveTypes: LEAVE_TYPES,
    leaveRequests: [],
    leaveBalances: [LEAVE_BALANCES[1]], // Bob — 0 remaining
    persons: PERSONS,
    permissions: READ_ONLY_PERMISSIONS,
  },
};
