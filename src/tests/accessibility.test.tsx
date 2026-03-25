// Enable demo login so the "Try Demo" button renders in TopBar tests.
process.env.NEXT_PUBLIC_DEMO_LOGIN = "true";

import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { PeopleOutlined } from "@mui/icons-material";
import { useSession } from "next-auth/react";
import type {
  ReviewRequest,
  ReviewTemplate,
  ReviewCycle,
  Person,
  Department,
  AuditLog,
  LeaveType,
  LeaveRequest,
  LeaveBalance,
  Permissions,
  OrgChartData,
  UserProfile,
} from "../schemas";
import type { DataExportCounts } from "../queries";

// ─── Component Imports ─────────────────────────────────────────────────────

import MyReviewsClient from "../components/MyReviewsClient";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import SearchBar from "../components/SearchBar";
import TopBar from "../components/TopBar";
import {
  TablePageSkeleton,
  DetailPageSkeleton,
  DashboardSkeleton,
} from "../components/PageSkeletons";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher";
import AddPersonForm from "../components/AddPeople";
import AddTeamForm from "../components/AddTeam";
import AddDepartmentForm from "../components/AddDepartment";
import ProfileEditor from "../components/ProfileEditor";
import LeaveManager from "../components/LeaveManager";
import DataImportExport from "../components/DataImportExport";
import AuditLogViewer from "../components/AuditLogViewer";
import ReviewSubmitClient from "../components/ReviewSubmitClient";
import ReviewTemplateDetailClient from "../components/ReviewTemplateDetailClient";
import ReviewTemplatesClient from "../components/ReviewTemplatesClient";
import ReviewCycleDetailClient from "../components/ReviewCycleDetailClient";
import PersonsTable from "../components/PersonsTable";
import DepartmentsTable from "../components/DepartmentsTable";
import TeamsTable from "../components/TeamsTable";
import OrgChartClient from "../components/OrgChartClient";

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/serverActions", () => ({
  createPerson: jest.fn(),
  createTeam: jest.fn(),
  createDepartment: jest.fn(),
  updateProfileName: jest.fn(),
  updateProfileImage: jest.fn(),
  createLeaveType: jest.fn(),
  updateLeaveType: jest.fn(),
  deleteLeaveType: jest.fn(),
  createLeaveRequest: jest.fn(),
  reviewLeaveRequest: jest.fn(),
  deleteLeaveRequest: jest.fn(),
  allocateLeaveBalance: jest.fn(),
  exportPersonsCsv: jest.fn(),
  exportTeamsCsv: jest.fn(),
  exportDepartmentsCsv: jest.fn(),
  exportAuditLogsCsv: jest.fn(),
  importPersonsCsv: jest.fn(),
  submitReview: jest.fn(),
  addReviewQuestion: jest.fn(),
  removeReviewQuestion: jest.fn(),
  createReviewTemplate: jest.fn(),
  deleteReviewTemplate: jest.fn(),
  openReviewCycle: jest.fn(),
  closeReviewCycle: jest.fn(),
  addReviewRequest: jest.fn(),
  removeReviewRequest: jest.fn(),
  deleteReviewCycle: jest.fn(),
  resetAll: jest.fn(),
  seedMockData: jest.fn(),
  beginTwoFactorSetup: jest.fn(),
  confirmTwoFactorSetup: jest.fn(),
  disableTwoFactor: jest.fn(),
  regenerateRecoveryCodes: jest.fn(),
}));

jest.mock("../components/CsvImportDialog", () => {
  return function MockCsvImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    return open ? (
      <div data-testid="csv-import-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

jest.mock("@xyflow/react", () => ({
  ReactFlow: ({
    nodes,
    edges,
    children,
  }: {
    nodes: unknown[];
    edges: unknown[];
    children: React.ReactNode;
  }) => (
    <div data-testid="reactflow" data-nodes={nodes.length} data-edges={edges.length}>
      {children}
    </div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  useNodesState: (initial: unknown[]) => [initial, jest.fn(), jest.fn()],
  useEdgesState: (initial: unknown[]) => [initial, jest.fn(), jest.fn()],
}));

jest.mock("dagre", () => {
  const nodes: Record<string, { x: number; y: number; width?: number; height?: number }> = {};
  let counter = 0;
  return {
    graphlib: {
      Graph: jest.fn().mockImplementation(() => ({
        setDefaultEdgeLabel: jest.fn(),
        setGraph: jest.fn(),
        setNode: (id: string, dims: { width?: number; height?: number }) => {
          nodes[id] = { x: counter * 250, y: counter * 100, ...dims };
          counter++;
        },
        setEdge: jest.fn(),
        node: (id: string) => nodes[id] || { x: 0, y: 0 },
      })),
    },
    layout: jest.fn(),
  };
});

// ─── Fixtures ──────────────────────────────────────────────────────────────

const NOW = new Date("2026-07-01T12:00:00Z");
const mockUseSession = useSession as jest.Mock;

const makeTemplate = (overrides: Partial<ReviewTemplate> = {}): ReviewTemplate => ({
  id: "tmpl-1",
  name: "Standard Review",
  description: "Standard performance review template",
  questions: [
    {
      id: "q-1",
      text: "Rate overall performance",
      type: "RATING",
      scaleMin: 1,
      scaleMax: 5,
      order: 0,
      required: true,
    },
    {
      id: "q-2",
      text: "Provide feedback on strengths",
      type: "TEXT",
      scaleMin: null,
      scaleMax: null,
      order: 1,
      required: false,
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeRequest = (overrides: Partial<ReviewRequest> = {}): ReviewRequest => ({
  id: "req-1",
  cycleId: "cycle-1",
  cycleName: "Q3 2026 Review",
  cycleStatus: "OPEN",
  subjectId: "p-1",
  subjectName: "Alice Johnson",
  reviewerId: "p-2",
  reviewerName: "Bob Smith",
  type: "PEER",
  status: "PENDING",
  createdAt: NOW,
  ...overrides,
});

const makeCycle = (
  overrides: Partial<ReviewCycle & { requests: ReviewRequest[] }> = {},
): ReviewCycle & { requests: ReviewRequest[] } => ({
  id: "cycle-1",
  name: "Q3 2026 Review",
  templateId: "tmpl-1",
  templateName: "Standard Review",
  status: "DRAFT",
  startDate: new Date("2026-07-01"),
  endDate: new Date("2026-09-30"),
  requestCount: 1,
  submittedCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
  requests: [makeRequest()],
  ...overrides,
});

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  id: "p-1",
  name: "Alice Johnson",
  email: "alice@example.com",
  position: "Engineer",
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeLeaveType = (overrides: Partial<LeaveType> = {}): LeaveType => ({
  id: "lt-1",
  name: "Annual Leave",
  description: "Paid annual leave",
  defaultDays: 25,
  color: "#4caf50",
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeLeaveRequest = (overrides: Partial<LeaveRequest> = {}): LeaveRequest => ({
  id: "lr-1",
  personId: "p-1",
  personName: "Alice Johnson",
  leaveTypeId: "lt-1",
  leaveTypeName: "Annual Leave",
  leaveTypeColor: "#4caf50",
  startDate: new Date("2026-07-01"),
  endDate: new Date("2026-07-05"),
  days: 5,
  note: "Summer vacation",
  status: "PENDING",
  reviewerId: null,
  reviewerName: null,
  reviewNote: null,
  reviewedAt: null,
  createdAt: NOW,
  ...overrides,
});

const makeLeaveBalance = (overrides: Partial<LeaveBalance> = {}): LeaveBalance => ({
  id: "lb-1",
  personId: "p-1",
  personName: "Alice Johnson",
  leaveTypeId: "lt-1",
  leaveTypeName: "Annual Leave",
  leaveTypeColor: "#4caf50",
  year: 2026,
  allocated: 25,
  used: 5,
  remaining: 20,
  ...overrides,
});

const allPermissions: Permissions = {
  "leave:view": true,
  "leave:request": true,
  "leave:approve": true,
  "leave:manage_types": true,
  "person:create": true,
  "person:edit": true,
  "person:delete": true,
  "team:create": true,
  "team:edit": true,
  "team:delete": true,
  "department:create": true,
  "department:edit": true,
  "department:delete": true,
  "data:import": true,
  "data:export": true,
  "admin:users": true,
  "review:view": true,
  "review:manage": true,
  "review:submit": true,
};

const baseProfile: UserProfile = {
  id: "aaa-111-bbb-222",
  email: "alice@example.com",
  name: "Alice Smith",
  image: null,
  role: "administrator",
  createdAt: new Date("2025-01-15"),
  updatedAt: new Date("2025-06-01"),
  resolvedPermissions: {
    "person:create": true,
    "person:read": true,
    "team:create": false,
    "admin:manage_users": false,
  },
  twoFactorEnabled: false,
};

const mockPersons: Person[] = [
  makePerson({ id: "1", name: "John Doe", position: "Developer", email: "john@example.com" }),
  makePerson({ id: "2", name: "Jane Smith", position: "Designer", email: "jane@example.com" }),
];

const mockDepartments: Department[] = [
  {
    id: "dept-1",
    name: "Engineering",
    description: "Software development",
    headId: "person-1",
    headName: "Alice Manager",
    createdAt: NOW,
    updatedAt: NOW,
    teams: [
      { teamId: "team-1", teamName: "Frontend" },
      { teamId: "team-2", teamName: "Backend" },
    ],
  },
];

const mockTeams = [
  {
    teamName: "Development",
    teamId: "1",
    teamManagerId: "mgr-1",
    managerName: "Manager1",
    departmentId: null,
    departmentName: null,
    createdAt: NOW,
    updatedAt: NOW,
    members: [
      { personId: "p1", name: "John Doe", email: "john@example.com" },
      { personId: "p2", name: "Jane Smith", email: "jane@example.com" },
    ],
  },
];

const defaultCounts: DataExportCounts = {
  persons: 10,
  teams: 5,
  departments: 3,
  auditLogs: 100,
};

function makePermissions(overrides: Partial<Record<string, boolean>> = {}): Permissions {
  const keys = [
    "person:create",
    "person:delete",
    "person:update_position",
    "person:update_name",
    "person:update_email",
    "person:read",
    "team:create",
    "team:delete",
    "team:update_name",
    "team:update_manager",
    "team:add_member",
    "team:remove_member",
    "team:read",
    "department:create",
    "department:delete",
    "department:update",
    "department:assign_team",
    "department:read",
    "data:reset",
    "data:seed",
    "admin:manage_users",
    "admin:assign_permissions",
    "admin:view_audit_log",
    "dashboard:view",
    "data:import",
    "data:export",
  ];
  const perms: Record<string, boolean> = {};
  for (const k of keys) perms[k] = false;
  return { ...perms, ...overrides } as unknown as Permissions;
}

const makeAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  userId: "c2ddfe11-be2d-4af9-8c7e-8ddadf592c33",
  userEmail: "alice@example.com",
  action: "create",
  entityType: "person",
  entityId: "d3eef222-1111-2222-3333-444455556666",
  before: null,
  after: '{"name":"Alice"}',
  createdAt: NOW,
  ...overrides,
});

const emptyOrgData: OrgChartData = {
  departments: [],
  unassignedTeams: [],
  unassignedPersons: [],
};

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("Accessibility (axe-core)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: {
        user: { name: "Alice Smith", email: "alice@example.com", image: null },
      },
      status: "authenticated",
    });
  });

  // ─── Simple Components ───────────────────────────────────────

  // MyReviewsClient has no axe violations.
  test("MyReviewsClient has no axe violations", async () => {
    const { container } = render(<MyReviewsClient />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // EmptyState has no axe violations.
  test("EmptyState has no axe violations", async () => {
    const { container } = render(<EmptyState icon={PeopleOutlined} title="No items found" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // ConfirmDialog has no axe violations when open.
  test("ConfirmDialog has no axe violations", async () => {
    const { container } = render(
      <ConfirmDialog
        open={true}
        title="Delete item?"
        message="This action cannot be undone."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  // SearchBar has no axe violations.
  test("SearchBar has no axe violations", async () => {
    const { container } = render(<SearchBar value="" onChange={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // TopBar has no axe violations.
  test("TopBar has no axe violations", async () => {
    const { container } = render(<TopBar title="Test Page" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // LanguageSwitcher has no axe violations.
  test("LanguageSwitcher has no axe violations", async () => {
    const { container } = render(<LanguageSwitcher />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // ThemeSwitcher has no axe violations.
  test("ThemeSwitcher has no axe violations", async () => {
    const { container } = render(<ThemeSwitcher />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // ─── Skeleton Components ─────────────────────────────────────

  // TablePageSkeleton has no axe violations.
  test("TablePageSkeleton has no axe violations", async () => {
    const { container } = render(<TablePageSkeleton />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // DetailPageSkeleton has no axe violations.
  test("DetailPageSkeleton has no axe violations", async () => {
    const { container } = render(<DetailPageSkeleton />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // DashboardSkeleton has no axe violations.
  test("DashboardSkeleton has no axe violations", async () => {
    const { container } = render(<DashboardSkeleton />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // ─── Form Components ────────────────────────────────────────

  // AddPersonForm has no axe violations.
  test("AddPersonForm has no axe violations", async () => {
    const { container } = render(<AddPersonForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // AddTeamForm has no axe violations.
  test("AddTeamForm has no axe violations", async () => {
    const { container } = render(<AddTeamForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // AddDepartmentForm has no axe violations.
  test("AddDepartmentForm has no axe violations", async () => {
    const { container } = render(<AddDepartmentForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // ProfileEditor has no axe violations.
  test("ProfileEditor has no axe violations", async () => {
    const { container } = render(<ProfileEditor profile={baseProfile} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // ─── Data Components ────────────────────────────────────────

  // LeaveManager has no axe violations.
  test("LeaveManager has no axe violations", async () => {
    const { container } = render(
      <LeaveManager
        leaveTypes={[makeLeaveType()]}
        leaveRequests={[makeLeaveRequest()]}
        leaveBalances={[makeLeaveBalance()]}
        persons={[makePerson()]}
        permissions={allPermissions}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  // DataImportExport has no axe violations.
  test("DataImportExport has no axe violations", async () => {
    const { container } = render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:import": true, "data:export": true })}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  // AuditLogViewer has no axe violations.
  test("AuditLogViewer has no axe violations", async () => {
    const { container } = render(
      <AuditLogViewer
        logs={[makeAuditLog()]}
        total={1}
        currentPage={1}
        pageSize={25}
        userEmails={[]}
        currentFilters={{}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  // ─── Review Components ──────────────────────────────────────

  // ReviewSubmitClient has no axe violations.
  test("ReviewSubmitClient has no axe violations", async () => {
    const { container } = render(
      <ReviewSubmitClient request={makeRequest()} template={makeTemplate()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  // ReviewTemplateDetailClient has no axe violations.
  test("ReviewTemplateDetailClient has no axe violations", async () => {
    const { container } = render(<ReviewTemplateDetailClient template={makeTemplate()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // ReviewTemplatesClient has no axe violations.
  test("ReviewTemplatesClient has no axe violations", async () => {
    const { container } = render(<ReviewTemplatesClient templates={[makeTemplate()]} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // ReviewCycleDetailClient has no axe violations.
  test("ReviewCycleDetailClient has no axe violations", async () => {
    const { container } = render(
      <ReviewCycleDetailClient
        cycle={makeCycle()}
        persons={[
          makePerson(),
          makePerson({ id: "p-2", name: "Bob Smith", email: "bob@example.com" }),
        ]}
        canManage={true}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  // ─── Table Components ───────────────────────────────────────

  // PersonsTable has no axe violations.
  test("PersonsTable has no axe violations", async () => {
    const { container } = render(<PersonsTable persons={mockPersons} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // DepartmentsTable has no axe violations.
  test("DepartmentsTable has no axe violations", async () => {
    const { container } = render(<DepartmentsTable departments={mockDepartments} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // TeamsTable has no axe violations.
  test("TeamsTable has no axe violations", async () => {
    const { container } = render(<TeamsTable combinedTeams={mockTeams} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  // OrgChartClient has no axe violations.
  test("OrgChartClient has no axe violations", async () => {
    const { container } = render(<OrgChartClient data={emptyOrgData} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
