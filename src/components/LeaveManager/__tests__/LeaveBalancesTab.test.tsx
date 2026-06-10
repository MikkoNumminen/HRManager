import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LeaveBalancesTab from "@/components/LeaveManager/LeaveBalancesTab";
import type { LeaveType, LeaveBalance, Person } from "@/schemas";
import { allocateLeaveBalance } from "@/serverActions";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/serverActions", () => ({
  allocateLeaveBalance: jest.fn(),
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
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const defaultProps = {
  balances: [makeLeaveBalance()],
  leaveTypes: [makeLeaveType()],
  persons: [makePerson()],
  canManageTypes: true,
};

describe("LeaveBalancesTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Rendering ──────────────────────────────────────────────

  // Renders person name in the balance table.
  test("renders person name in balance table", () => {
    render(<LeaveBalancesTab {...defaultProps} />);
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
  });

  // Renders year, allocated, used, and remaining columns.
  test("renders year, allocated, used, and remaining values", () => {
    render(<LeaveBalancesTab {...defaultProps} />);
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  // Renders a leave type chip with the type name.
  test("renders leave type chip with name", () => {
    render(<LeaveBalancesTab {...defaultProps} />);
    expect(screen.getByText("Annual Leave")).toBeInTheDocument();
  });

  // Shows empty state message when no balances provided.
  test("shows empty state when no balances", () => {
    render(<LeaveBalancesTab {...defaultProps} balances={[]} />);
    expect(screen.getByText("No leave balances allocated")).toBeInTheDocument();
  });

  // Renders multiple balance rows.
  test("renders multiple balances", () => {
    const balances = [
      makeLeaveBalance({ id: "lb-1", personName: "Alice", year: 2026 }),
      makeLeaveBalance({ id: "lb-2", personName: "Bob", year: 2025 }),
    ];
    render(<LeaveBalancesTab {...defaultProps} balances={balances} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  // ─── Remaining days color branching ─────────────────────────

  // Remaining days > 0 renders the success color path (remaining is positive).
  test("renders remaining days when remaining is positive", () => {
    render(<LeaveBalancesTab {...defaultProps} balances={[makeLeaveBalance({ remaining: 10 })]} />);
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  // Remaining days = 0 triggers the error color branch (remaining is NOT > 0).
  test("renders remaining days when remaining is zero (error color branch)", () => {
    render(<LeaveBalancesTab {...defaultProps} balances={[makeLeaveBalance({ remaining: 0 })]} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  // Remaining days < 0 also triggers the error color branch.
  test("renders remaining days when remaining is negative (error color branch)", () => {
    render(<LeaveBalancesTab {...defaultProps} balances={[makeLeaveBalance({ remaining: -2 })]} />);
    expect(screen.getByText("-2")).toBeInTheDocument();
  });

  // ─── canManageTypes = false ──────────────────────────────────

  // Hides allocate button when canManageTypes is false.
  test("hides allocate button when canManageTypes is false", () => {
    render(<LeaveBalancesTab {...defaultProps} canManageTypes={false} />);
    expect(screen.queryByText("Allocate Balance")).not.toBeInTheDocument();
  });

  // ─── canManageTypes = true ───────────────────────────────────

  // Shows allocate button when canManageTypes is true.
  test("shows allocate button when canManageTypes is true", () => {
    render(<LeaveBalancesTab {...defaultProps} canManageTypes={true} />);
    expect(screen.getByText("Allocate Balance")).toBeInTheDocument();
  });

  // ─── Allocate Form ───────────────────────────────────────────

  // Opens the allocate form when the allocate button is clicked.
  test("opens allocate form on button click", () => {
    render(<LeaveBalancesTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Allocate Balance"));
    expect(screen.getByText("Select Person")).toBeInTheDocument();
    expect(screen.getByText("Select Leave Type")).toBeInTheDocument();
    expect(screen.getByText("Allocated Days")).toBeInTheDocument();
  });

  // Closes the allocate form when Cancel is clicked.
  test("closes allocate form on cancel click", () => {
    render(<LeaveBalancesTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Allocate Balance"));
    fireEvent.click(screen.getByText("Cancel Request"));
    expect(screen.queryByText("Select Person")).not.toBeInTheDocument();
  });

  // Renders person options in the allocate form as MenuItem children.
  test("renders person options in allocate form", () => {
    render(<LeaveBalancesTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Allocate Balance"));
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
  });

  // Renders leave type options in the allocate form as MenuItem children.
  test("renders leave type options in allocate form", () => {
    render(<LeaveBalancesTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Allocate Balance"));
    expect(screen.getByText("Annual Leave")).toBeInTheDocument();
  });

  // Renders the year field with the current year as default value.
  test("renders year field with current year as default", () => {
    render(<LeaveBalancesTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Allocate Balance"));
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByDisplayValue(currentYear)).toBeInTheDocument();
  });

  // Submits the allocate form and calls allocateLeaveBalance with FormData.
  test("submits allocate form and calls allocateLeaveBalance", async () => {
    (allocateLeaveBalance as jest.Mock).mockResolvedValue(undefined);
    render(<LeaveBalancesTab {...defaultProps} />);

    fireEvent.click(screen.getByText("Allocate Balance"));

    // Submit via the form element directly to trigger useActionState action
    // eslint-disable-next-line testing-library/no-node-access
    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(allocateLeaveBalance).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows snackbar and closes form after successful allocation.
  test("shows snackbar and closes form after successful allocation", async () => {
    const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    mockShowSnackbar.mockClear();
    (allocateLeaveBalance as jest.Mock).mockResolvedValue(undefined);

    render(<LeaveBalancesTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Allocate Balance"));

    // eslint-disable-next-line testing-library/no-node-access
    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Leave balance allocated");
    });
  });

  // Shows error message in the allocate form when the action returns an error.
  test("shows error in allocate form when action returns error", async () => {
    (allocateLeaveBalance as jest.Mock).mockResolvedValue({ error: "Duplicate balance" });
    render(<LeaveBalancesTab {...defaultProps} />);

    fireEvent.click(screen.getByText("Allocate Balance"));
    // eslint-disable-next-line testing-library/no-node-access
    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Duplicate balance")).toBeInTheDocument();
    });
  });

  // ─── Empty options in form ───────────────────────────────────

  // Renders the allocate form with empty persons list — label present, no items.
  test("renders allocate form with empty persons list", () => {
    render(<LeaveBalancesTab {...defaultProps} persons={[]} />);
    fireEvent.click(screen.getByText("Allocate Balance"));
    expect(screen.getByText("Select Person")).toBeInTheDocument();
  });

  // Renders the allocate form with empty leave types list — label present, no items.
  test("renders allocate form with empty leave types list", () => {
    render(<LeaveBalancesTab {...defaultProps} leaveTypes={[]} />);
    fireEvent.click(screen.getByText("Allocate Balance"));
    expect(screen.getByText("Select Leave Type")).toBeInTheDocument();
  });
});
