import { render, screen } from "@testing-library/react";
import EmployeeLeaveClient from "@/components/EmployeeLeaveClient";
import { LeaveBalance, LeaveRequest } from "@/schemas";

const makeBalance = (overrides: Partial<LeaveBalance> = {}): LeaveBalance => ({
  id: "b1",
  personId: "p1",
  personName: "Alice",
  leaveTypeId: "lt1",
  leaveTypeName: "Annual",
  leaveTypeColor: "#00ff00",
  year: 2025,
  allocated: 20,
  used: 5,
  remaining: 15,
  ...overrides,
});

const makeRequest = (overrides: Partial<LeaveRequest> = {}): LeaveRequest => ({
  id: "r1",
  personId: "p1",
  personName: "Alice",
  leaveTypeId: "lt1",
  leaveTypeName: "Annual",
  leaveTypeColor: "#00ff00",
  startDate: new Date("2025-07-01"),
  endDate: new Date("2025-07-05"),
  days: 5,
  note: null,
  status: "pending",
  reviewerId: null,
  reviewerName: null,
  reviewNote: null,
  reviewedAt: null,
  createdAt: new Date("2025-06-01"),
  ...overrides,
});

describe("EmployeeLeaveClient", () => {
  // Shows a read-only notice at the top.
  test("renders read-only alert", () => {
    render(<EmployeeLeaveClient leaveBalances={[]} leaveRequests={[]} />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });

  // Shows empty state message when there are no leave balances.
  test("shows no leave balance message when empty", () => {
    render(<EmployeeLeaveClient leaveBalances={[]} leaveRequests={[]} />);
    expect(screen.getByText(/no leave balance/i)).toBeInTheDocument();
  });

  // Shows empty state message when there are no leave requests.
  test("shows no leave requests message when empty", () => {
    render(<EmployeeLeaveClient leaveBalances={[]} leaveRequests={[]} />);
    expect(screen.getByText(/no leave requests/i)).toBeInTheDocument();
  });

  // Renders leave type name and remaining days in the balance table.
  test("renders leave balance row", () => {
    render(<EmployeeLeaveClient leaveBalances={[makeBalance()]} leaveRequests={[]} />);
    expect(screen.getByText("Annual")).toBeInTheDocument();
    // remaining = 15 appears in the table
    expect(screen.getAllByText("15").length).toBeGreaterThan(0);
  });

  // Renders allocated and used columns in balance table.
  test("renders allocated and used values", () => {
    render(
      <EmployeeLeaveClient
        leaveBalances={[makeBalance({ allocated: 20, used: 5, remaining: 15 })]}
        leaveRequests={[]}
      />,
    );
    expect(screen.getAllByText("20").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
  });

  // Renders leave request rows when they exist.
  test("renders leave request rows", () => {
    render(<EmployeeLeaveClient leaveBalances={[]} leaveRequests={[makeRequest()]} />);
    // The leave type name should appear in the table
    expect(screen.getAllByText("Annual").length).toBeGreaterThan(0);
    // The days count should appear
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
  });

  // Shows status chip for pending leave requests.
  test("renders pending status chip", () => {
    render(
      <EmployeeLeaveClient
        leaveBalances={[]}
        leaveRequests={[makeRequest({ status: "pending" })]}
      />,
    );
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  // Shows status chip for approved leave requests.
  test("renders approved status chip", () => {
    render(
      <EmployeeLeaveClient
        leaveBalances={[]}
        leaveRequests={[makeRequest({ status: "approved" })]}
      />,
    );
    expect(screen.getByText(/approved/i)).toBeInTheDocument();
  });

  // Shows status chip for rejected leave requests.
  test("renders rejected status chip", () => {
    render(
      <EmployeeLeaveClient
        leaveBalances={[]}
        leaveRequests={[makeRequest({ status: "rejected" })]}
      />,
    );
    expect(screen.getByText(/rejected/i)).toBeInTheDocument();
  });

  // Can render multiple balances.
  test("renders multiple leave balance rows", () => {
    const balances = [
      makeBalance({ id: "b1", leaveTypeName: "Annual", remaining: 15 }),
      makeBalance({ id: "b2", leaveTypeName: "Sick", leaveTypeId: "lt2", remaining: 8 }),
    ];
    render(<EmployeeLeaveClient leaveBalances={balances} leaveRequests={[]} />);
    expect(screen.getByText("Sick")).toBeInTheDocument();
  });
});
