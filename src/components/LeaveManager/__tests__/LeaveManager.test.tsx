import { render, screen, fireEvent } from "@testing-library/react";
import LeaveManager from "@/components/LeaveManager/LeaveManager";
import type { LeaveType, LeaveRequest, LeaveBalance, Person, Permissions } from "@/schemas";

// Mock sub-tabs so we only test LeaveManager's own logic (tab switching, filtering, permissions).
jest.mock("@/components/LeaveManager/LeaveRequestsTab", () => ({
  __esModule: true,
  default: (props: {
    requests: LeaveRequest[];
    canRequest: boolean;
    canApprove: boolean;
    statusFilter: string;
    onStatusFilter: (v: string) => void;
  }) => (
    <div data-testid="requests-tab">
      <span data-testid="requests-count">{props.requests.length}</span>
      <span data-testid="can-request">{String(props.canRequest)}</span>
      <span data-testid="can-approve">{String(props.canApprove)}</span>
      <span data-testid="status-filter">{props.statusFilter}</span>
      <button onClick={() => props.onStatusFilter("pending")}>filter-pending</button>
    </div>
  ),
}));

jest.mock("@/components/LeaveManager/LeaveTypesTab", () => ({
  __esModule: true,
  default: (props: { leaveTypes: LeaveType[]; canManageTypes: boolean }) => (
    <div data-testid="types-tab">
      <span data-testid="types-count">{props.leaveTypes.length}</span>
      <span data-testid="can-manage-types">{String(props.canManageTypes)}</span>
    </div>
  ),
}));

jest.mock("@/components/LeaveManager/LeaveBalancesTab", () => ({
  __esModule: true,
  default: (props: { balances: LeaveBalance[]; canManageTypes: boolean }) => (
    <div data-testid="balances-tab">
      <span data-testid="balances-count">{props.balances.length}</span>
      <span data-testid="can-manage-types-balances">{String(props.canManageTypes)}</span>
    </div>
  ),
}));

const NOW = new Date("2026-07-01T12:00:00Z");

const makeLeaveType = (overrides: Partial<LeaveType> = {}): LeaveType => ({
  id: "lt-1",
  name: "Annual Leave",
  description: "Paid leave",
  defaultDays: 25,
  color: "#4caf50",
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeLeaveRequest = (overrides: Partial<LeaveRequest> = {}): LeaveRequest => ({
  id: "lr-1",
  personId: "p-1",
  personName: "Alice",
  leaveTypeId: "lt-1",
  leaveTypeName: "Annual Leave",
  leaveTypeColor: "#4caf50",
  startDate: new Date("2026-07-01"),
  endDate: new Date("2026-07-05"),
  days: 5,
  note: null,
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
  personName: "Alice",
  leaveTypeId: "lt-1",
  leaveTypeName: "Annual Leave",
  allocatedDays: 25,
  usedDays: 5,
  remainingDays: 20,
  year: 2026,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makePerson = (overrides: Partial<Person> = {}): Person => ({
  id: "p-1",
  name: "Alice",
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
  "leave:request": true,
  "leave:approve": true,
  "leave:manage_types": true,
};

const noPermissions: Permissions = {
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

  // ─── Initial Render ──────────────────────────────────────────

  // Renders the Requests tab content by default (tab index 0).
  test("renders requests tab by default", () => {
    render(<LeaveManager {...defaultProps} />);
    expect(screen.getByTestId("requests-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("types-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("balances-tab")).not.toBeInTheDocument();
  });

  // Renders three tab labels (using actual translation values from en.json).
  test("renders three tab labels", () => {
    render(<LeaveManager {...defaultProps} />);
    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("Types")).toBeInTheDocument();
    expect(screen.getByText("Balances")).toBeInTheDocument();
  });

  // ─── Tab Switching ───────────────────────────────────────────

  // Clicking the Types tab shows LeaveTypesTab and hides LeaveRequestsTab.
  test("switches to types tab on click", () => {
    render(<LeaveManager {...defaultProps} />);
    fireEvent.click(screen.getByText("Types"));
    expect(screen.getByTestId("types-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("requests-tab")).not.toBeInTheDocument();
  });

  // Clicking the Balances tab shows LeaveBalancesTab and hides others.
  test("switches to balances tab on click", () => {
    render(<LeaveManager {...defaultProps} />);
    fireEvent.click(screen.getByText("Balances"));
    expect(screen.getByTestId("balances-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("requests-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("types-tab")).not.toBeInTheDocument();
  });

  // Can navigate back to Requests tab after switching away.
  test("can navigate back to requests tab", () => {
    render(<LeaveManager {...defaultProps} />);
    fireEvent.click(screen.getByText("Types"));
    fireEvent.click(screen.getByText("Requests"));
    expect(screen.getByTestId("requests-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("types-tab")).not.toBeInTheDocument();
  });

  // ─── Permission Propagation ──────────────────────────────────

  // Passes canRequest=true to LeaveRequestsTab when permission granted.
  test("passes canRequest=true when permission granted", () => {
    render(<LeaveManager {...defaultProps} permissions={{ ...allPermissions }} />);
    expect(screen.getByTestId("can-request")).toHaveTextContent("true");
  });

  // Passes canRequest=false to LeaveRequestsTab when permission not granted.
  test("passes canRequest=false when permission denied", () => {
    render(<LeaveManager {...defaultProps} permissions={noPermissions} />);
    expect(screen.getByTestId("can-request")).toHaveTextContent("false");
  });

  // Passes canApprove=true when permission granted.
  test("passes canApprove=true when permission granted", () => {
    render(<LeaveManager {...defaultProps} permissions={{ ...allPermissions }} />);
    expect(screen.getByTestId("can-approve")).toHaveTextContent("true");
  });

  // Passes canApprove=false when permission denied.
  test("passes canApprove=false when permission denied", () => {
    render(<LeaveManager {...defaultProps} permissions={noPermissions} />);
    expect(screen.getByTestId("can-approve")).toHaveTextContent("false");
  });

  // Passes canManageTypes=true to LeaveTypesTab when permission granted.
  test("passes canManageTypes=true to types tab", () => {
    render(<LeaveManager {...defaultProps} />);
    fireEvent.click(screen.getByText("Types"));
    expect(screen.getByTestId("can-manage-types")).toHaveTextContent("true");
  });

  // Passes canManageTypes=false to LeaveTypesTab when permission denied.
  test("passes canManageTypes=false to types tab when denied", () => {
    render(<LeaveManager {...defaultProps} permissions={noPermissions} />);
    fireEvent.click(screen.getByText("Types"));
    expect(screen.getByTestId("can-manage-types")).toHaveTextContent("false");
  });

  // Passes canManageTypes to LeaveBalancesTab.
  test("passes canManageTypes to balances tab", () => {
    render(<LeaveManager {...defaultProps} />);
    fireEvent.click(screen.getByText("Balances"));
    expect(screen.getByTestId("can-manage-types-balances")).toHaveTextContent("true");
  });

  // ─── Status Filter ───────────────────────────────────────────

  // Initial statusFilter passed to requests tab is "all".
  test("passes initial statusFilter=all to requests tab", () => {
    render(<LeaveManager {...defaultProps} />);
    expect(screen.getByTestId("status-filter")).toHaveTextContent("all");
  });

  // Updating status filter propagates filtered requests to the tab.
  test("filters requests when statusFilter changes to pending", () => {
    const pendingRequest = makeLeaveRequest({ status: "PENDING" });
    const approvedRequest = makeLeaveRequest({ id: "lr-2", status: "APPROVED" });
    render(<LeaveManager {...defaultProps} leaveRequests={[pendingRequest, approvedRequest]} />);
    // Initially all 2 requests shown
    expect(screen.getByTestId("requests-count")).toHaveTextContent("2");
    // Click the filter-pending button inside the mock tab
    fireEvent.click(screen.getByText("filter-pending"));
    // Now only PENDING requests shown
    expect(screen.getByTestId("requests-count")).toHaveTextContent("1");
    expect(screen.getByTestId("status-filter")).toHaveTextContent("pending");
  });

  // When filter is "all" all requests are shown regardless of status.
  test("shows all requests when statusFilter is all", () => {
    const requests = [
      makeLeaveRequest({ id: "lr-1", status: "PENDING" }),
      makeLeaveRequest({ id: "lr-2", status: "APPROVED" }),
      makeLeaveRequest({ id: "lr-3", status: "REJECTED" }),
    ];
    render(<LeaveManager {...defaultProps} leaveRequests={requests} />);
    expect(screen.getByTestId("requests-count")).toHaveTextContent("3");
  });

  // ─── Data Propagation ───────────────────────────────────────

  // LeaveTypesTab receives the correct leaveTypes count.
  test("passes leaveTypes to types tab", () => {
    const types = [makeLeaveType({ id: "lt-1" }), makeLeaveType({ id: "lt-2" })];
    render(<LeaveManager {...defaultProps} leaveTypes={types} />);
    fireEvent.click(screen.getByText("Types"));
    expect(screen.getByTestId("types-count")).toHaveTextContent("2");
  });

  // LeaveBalancesTab receives the correct balances count.
  test("passes leaveBalances to balances tab", () => {
    const balances = [
      makeLeaveBalance({ id: "lb-1" }),
      makeLeaveBalance({ id: "lb-2" }),
      makeLeaveBalance({ id: "lb-3" }),
    ];
    render(<LeaveManager {...defaultProps} leaveBalances={balances} />);
    fireEvent.click(screen.getByText("Balances"));
    expect(screen.getByTestId("balances-count")).toHaveTextContent("3");
  });

  // ─── Empty States ────────────────────────────────────────────

  // Works correctly with empty leaveRequests array.
  test("handles empty leaveRequests", () => {
    render(<LeaveManager {...defaultProps} leaveRequests={[]} />);
    expect(screen.getByTestId("requests-count")).toHaveTextContent("0");
  });

  // Works correctly with empty leaveTypes array.
  test("handles empty leaveTypes", () => {
    render(<LeaveManager {...defaultProps} leaveTypes={[]} />);
    fireEvent.click(screen.getByText("Types"));
    expect(screen.getByTestId("types-count")).toHaveTextContent("0");
  });

  // Works correctly with empty leaveBalances array.
  test("handles empty leaveBalances", () => {
    render(<LeaveManager {...defaultProps} leaveBalances={[]} />);
    fireEvent.click(screen.getByText("Balances"));
    expect(screen.getByTestId("balances-count")).toHaveTextContent("0");
  });

  // ─── Filter case-insensitive matching ─────────────────────

  // Filters status case-insensitively (status stored as UPPERCASE, filter as lowercase).
  test("case-insensitive status filtering matches uppercase statuses", () => {
    const requests = [
      makeLeaveRequest({ id: "lr-1", status: "APPROVED" }),
      makeLeaveRequest({ id: "lr-2", status: "PENDING" }),
    ];
    render(<LeaveManager {...defaultProps} leaveRequests={requests} />);
    // Trigger "pending" filter
    fireEvent.click(screen.getByText("filter-pending"));
    // Only PENDING should match "pending" case-insensitively
    expect(screen.getByTestId("requests-count")).toHaveTextContent("1");
  });
});
