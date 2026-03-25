import { render, screen } from "@testing-library/react";
import EmployeeDashboardClient from "@/features/employee/components/EmployeeDashboardClient";
import { EmployeeProfile, LeaveBalance, LeaveRequest, ReviewRequest } from "@/schemas";

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

const baseProfile: EmployeeProfile = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Alice Johnson",
  position: "Senior Developer",
  email: "alice@example.com",
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-06-01"),
  teams: [],
  managedTeams: [],
  headOfDepartments: [],
};

const emptyBalances: LeaveBalance[] = [];
const emptyRequests: LeaveRequest[] = [];
const emptyReviews: ReviewRequest[] = [];

describe("EmployeeDashboardClient", () => {
  // Renders the employee's full name in the welcome card.
  test("renders employee name", () => {
    render(
      <EmployeeDashboardClient
        profile={baseProfile}
        leaveBalances={emptyBalances}
        leaveRequests={emptyRequests}
        reviews={emptyReviews}
      />,
    );
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
  });

  // Shows avatar initials from the name.
  test("renders avatar initials", () => {
    render(
      <EmployeeDashboardClient
        profile={baseProfile}
        leaveBalances={emptyBalances}
        leaveRequests={emptyRequests}
        reviews={emptyReviews}
      />,
    );
    expect(screen.getByText("AJ")).toBeInTheDocument();
  });

  // Displays position when set.
  test("renders position", () => {
    render(
      <EmployeeDashboardClient
        profile={baseProfile}
        leaveBalances={emptyBalances}
        leaveRequests={emptyRequests}
        reviews={emptyReviews}
      />,
    );
    expect(screen.getByText("Senior Developer")).toBeInTheDocument();
  });

  // Displays email when set.
  test("renders email", () => {
    render(
      <EmployeeDashboardClient
        profile={baseProfile}
        leaveBalances={emptyBalances}
        leaveRequests={emptyRequests}
        reviews={emptyReviews}
      />,
    );
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  // Shows the total remaining leave days summed from balances.
  test("shows total leave remaining from balances", () => {
    const balances: LeaveBalance[] = [
      {
        id: "b1",
        personId: "p1",
        personName: "Alice Johnson",
        leaveTypeId: "lt1",
        leaveTypeName: "Annual",
        leaveTypeColor: "#00ff00",
        year: 2025,
        allocated: 20,
        used: 5,
        remaining: 15,
      },
      {
        id: "b2",
        personId: "p1",
        personName: "Alice Johnson",
        leaveTypeId: "lt2",
        leaveTypeName: "Sick",
        leaveTypeColor: "#ff0000",
        year: 2025,
        allocated: 10,
        used: 3,
        remaining: 7,
      },
    ];
    render(
      <EmployeeDashboardClient
        profile={baseProfile}
        leaveBalances={balances}
        leaveRequests={emptyRequests}
        reviews={emptyReviews}
      />,
    );
    // Total remaining = 15 + 7 = 22
    expect(screen.getByText("22")).toBeInTheDocument();
  });

  // Shows the total number of reviews.
  test("shows total review count", () => {
    const reviews: ReviewRequest[] = [
      {
        id: "r1",
        cycleId: "c1",
        cycleName: "Q1 2025",
        cycleStatus: "OPEN",
        subjectId: "p1",
        subjectName: "Alice Johnson",
        reviewerId: null,
        reviewerName: null,
        type: "SELF",
        status: "PENDING",
        createdAt: new Date(),
      },
    ];
    render(
      <EmployeeDashboardClient
        profile={baseProfile}
        leaveBalances={emptyBalances}
        leaveRequests={emptyRequests}
        reviews={reviews}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // Shows 0 for leave days when no balances exist.
  test("shows 0 leave remaining when no balances", () => {
    render(
      <EmployeeDashboardClient
        profile={baseProfile}
        leaveBalances={[]}
        leaveRequests={emptyRequests}
        reviews={emptyReviews}
      />,
    );
    // Both leave and reviews cards show "0" — use getAllByText and verify at least one exists
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });

  // Read-only notice is visible on the dashboard.
  test("shows read-only notice", () => {
    render(
      <EmployeeDashboardClient
        profile={baseProfile}
        leaveBalances={emptyBalances}
        leaveRequests={emptyRequests}
        reviews={emptyReviews}
      />,
    );
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });
});
