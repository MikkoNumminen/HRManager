import { render, screen, fireEvent } from "@testing-library/react";
import LeaveManager from "../components/LeaveManager";
import type { LeaveType, LeaveRequest, LeaveBalance, Person, Permissions } from "../schemas";

// Mock server actions — component tests verify UI behavior, not server logic.
// Components import via @/serverActions barrel which re-exports from feature modules.
jest.mock("@/serverActions", () => ({
  createLeaveType: jest.fn(),
  updateLeaveType: jest.fn(),
  deleteLeaveType: jest.fn(),
  createLeaveRequest: jest.fn(),
  reviewLeaveRequest: jest.fn(),
  deleteLeaveRequest: jest.fn(),
  allocateLeaveBalance: jest.fn(),
}));

// Mock the snackbar provider — captures snackbar calls.
const mockShowSnackbar = jest.fn();
jest.mock("../components/shared/SnackbarProvider", () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));

const NOW = new Date("2026-07-01T12:00:00Z");

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

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  id: "p-1",
  name: "Alice Johnson",
  email: "alice@example.com",
  position: "Engineer",
  managerId: null,
  managerName: null,
  teamId: null,
  teamName: null,
  createdAt: NOW,
  updatedAt: NOW,
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

const viewOnlyPermissions: Permissions = {
  ...allPermissions,
  "leave:request": false,
  "leave:approve": false,
  "leave:manage_types": false,
};

const defaultProps = {
  leaveTypes: [makeLeaveType()],
  leaveRequests: [makeLeaveRequest()],
  leaveBalances: [makeLeaveBalance()],
  persons: [makePerson()],
  permissions: allPermissions,
};

describe("LeaveManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Tab Navigation ─────────────────────────────────────────

  // Renders all three tabs.
  test("renders all three tabs", () => {
    render(<LeaveManager {...defaultProps} />);
    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("Types")).toBeInTheDocument();
    expect(screen.getByText("Balances")).toBeInTheDocument();
  });

  // Switches tabs when clicked.
  test("switches to Types tab when clicked", () => {
    render(<LeaveManager {...defaultProps} />);
    fireEvent.click(screen.getByText("Types"));
    // Types tab content: shows leave type name
    expect(screen.getByText("Annual Leave")).toBeInTheDocument();
  });

  // ─── Requests Tab ───────────────────────────────────────────

  // Shows request data in the table.
  test("shows leave request data in table", () => {
    render(<LeaveManager {...defaultProps} />);
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Annual Leave")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  // Shows create request button when user has leave:request permission.
  test("shows create request button with leave:request permission", () => {
    render(<LeaveManager {...defaultProps} />);
    expect(screen.getAllByText("Submit Leave Request").length).toBeGreaterThan(0);
  });

  // Hides create request button without leave:request permission.
  test("hides create request button without leave:request permission", () => {
    render(
      <LeaveManager
        {...defaultProps}
        permissions={{ ...allPermissions, "leave:request": false }}
      />,
    );
    expect(screen.queryByText("Submit Leave Request")).not.toBeInTheDocument();
  });

  // Shows approve/reject buttons for pending requests when canApprove.
  test("shows approve/reject buttons for pending requests", () => {
    render(<LeaveManager {...defaultProps} />);
    expect(screen.getByLabelText("Approve")).toBeInTheDocument();
    expect(screen.getByLabelText("Reject")).toBeInTheDocument();
  });

  // Hides approve/reject buttons without leave:approve permission.
  test("hides approve/reject for non-approvers", () => {
    render(
      <LeaveManager
        {...defaultProps}
        permissions={{ ...allPermissions, "leave:approve": false }}
      />,
    );
    expect(screen.queryByLabelText("Approve")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Reject")).not.toBeInTheDocument();
  });

  // Does not show approve/reject for already-approved requests.
  test("no approve/reject buttons for approved requests", () => {
    render(
      <LeaveManager {...defaultProps} leaveRequests={[makeLeaveRequest({ status: "APPROVED" })]} />,
    );
    expect(screen.queryByLabelText("Approve")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Reject")).not.toBeInTheDocument();
  });

  // Shows the create request form when button is clicked.
  test("opens create request form on button click", () => {
    render(<LeaveManager {...defaultProps} />);
    // Click the button (first instance — the button text)
    const buttons = screen.getAllByText("Submit Leave Request");
    fireEvent.click(buttons[0]);
    // Form fields should appear — MUI select uses role="combobox" with label
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("End Date")).toBeInTheDocument();
  });

  // Empty state message when no requests.
  test("shows empty state when no requests", () => {
    render(<LeaveManager {...defaultProps} leaveRequests={[]} />);
    expect(screen.getByText("No leave requests")).toBeInTheDocument();
  });

  // Status filter dropdown.
  test("renders status filter dropdown", () => {
    render(<LeaveManager {...defaultProps} />);
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  // ─── Leave Types Tab ────────────────────────────────────────

  // Shows leave type data.
  test("shows leave type data in Types tab", () => {
    render(<LeaveManager {...defaultProps} />);
    fireEvent.click(screen.getByText("Types"));
    expect(screen.getByText("Annual Leave")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  // Shows create leave type button with manage permission.
  test("shows create type button with leave:manage_types permission", () => {
    render(<LeaveManager {...defaultProps} />);
    fireEvent.click(screen.getByText("Types"));
    expect(screen.getByText("Create Leave Type")).toBeInTheDocument();
  });

  // Hides management controls for view-only users.
  test("hides management controls for view-only users", () => {
    render(<LeaveManager {...defaultProps} permissions={viewOnlyPermissions} />);
    fireEvent.click(screen.getByText("Types"));
    expect(screen.queryByText("Create Leave Type")).not.toBeInTheDocument();
  });

  // Empty state for no leave types.
  test("shows empty state when no leave types", () => {
    render(<LeaveManager {...defaultProps} leaveTypes={[]} />);
    fireEvent.click(screen.getByText("Types"));
    expect(screen.getByText("No leave types configured")).toBeInTheDocument();
  });

  // ─── Balances Tab ───────────────────────────────────────────

  // Shows balance data.
  test("shows balance data in Balances tab", () => {
    render(<LeaveManager {...defaultProps} />);
    fireEvent.click(screen.getByText("Balances"));
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument(); // remaining
  });

  // Shows allocate button with manage permission.
  test("shows allocate button with leave:manage_types permission", () => {
    render(<LeaveManager {...defaultProps} />);
    fireEvent.click(screen.getByText("Balances"));
    expect(screen.getByText("Allocate Balance")).toBeInTheDocument();
  });

  // Hides allocate button without manage permission.
  test("hides allocate button without leave:manage_types permission", () => {
    render(<LeaveManager {...defaultProps} permissions={viewOnlyPermissions} />);
    fireEvent.click(screen.getByText("Balances"));
    expect(screen.queryByText("Allocate Balance")).not.toBeInTheDocument();
  });

  // Empty state for no balances.
  test("shows empty state when no balances", () => {
    render(<LeaveManager {...defaultProps} leaveBalances={[]} />);
    fireEvent.click(screen.getByText("Balances"));
    expect(screen.getByText("No leave balances allocated")).toBeInTheDocument();
  });

  // Multiple leave request statuses render correctly.
  test("renders multiple requests with different statuses", () => {
    const requests = [
      makeLeaveRequest({ id: "lr-1", status: "PENDING", personName: "Alice" }),
      makeLeaveRequest({ id: "lr-2", status: "APPROVED", personName: "Bob" }),
      makeLeaveRequest({ id: "lr-3", status: "REJECTED", personName: "Charlie" }),
    ];
    render(<LeaveManager {...defaultProps} leaveRequests={requests} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });
});
