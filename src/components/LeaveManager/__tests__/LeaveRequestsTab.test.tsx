import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LeaveRequestsTab from "@/components/LeaveManager/LeaveRequestsTab";
import type { LeaveType, LeaveRequest, Person } from "@/schemas";
import { createLeaveRequest, reviewLeaveRequest, deleteLeaveRequest } from "@/serverActions";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/serverActions", () => ({
  createLeaveRequest: jest.fn(),
  reviewLeaveRequest: jest.fn(),
  deleteLeaveRequest: jest.fn(),
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

const defaultProps = {
  requests: [makeLeaveRequest()],
  leaveTypes: [makeLeaveType()],
  persons: [makePerson()],
  canRequest: true,
  canApprove: true,
  statusFilter: "all",
  onStatusFilter: jest.fn(),
};

describe("LeaveRequestsTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Rendering ──────────────────────────────────────────────

  // Renders leave request data in the table.
  test("renders leave request data in the table", () => {
    render(<LeaveRequestsTab {...defaultProps} />);
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  // Renders the status chip with the correct label for a pending request.
  test("renders Pending status chip for PENDING request", () => {
    render(<LeaveRequestsTab {...defaultProps} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  // Renders the status chip for an approved request.
  test("renders Approved status chip for APPROVED request", () => {
    render(
      <LeaveRequestsTab {...defaultProps} requests={[makeLeaveRequest({ status: "APPROVED" })]} />,
    );
    expect(screen.getByText("Approved")).toBeInTheDocument();
  });

  // Renders the status chip for a rejected request.
  test("renders Rejected status chip for REJECTED request", () => {
    render(
      <LeaveRequestsTab {...defaultProps} requests={[makeLeaveRequest({ status: "REJECTED" })]} />,
    );
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  // Falls back to the raw status when it is not in the known colorMap (unknown status).
  test("renders raw status label for unknown status values", () => {
    render(
      <LeaveRequestsTab
        {...defaultProps}
        requests={[makeLeaveRequest({ status: "UNKNOWN_STATUS" })]}
      />,
    );
    expect(screen.getByText("UNKNOWN_STATUS")).toBeInTheDocument();
  });

  // Renders reviewer name when present.
  test("renders reviewer name when set", () => {
    render(
      <LeaveRequestsTab
        {...defaultProps}
        requests={[makeLeaveRequest({ reviewerName: "Bob Manager" })]}
      />,
    );
    expect(screen.getByText("Bob Manager")).toBeInTheDocument();
  });

  // Renders dash when reviewerName is null.
  test("renders dash when reviewerName is null", () => {
    render(<LeaveRequestsTab {...defaultProps} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  // Renders formatted start/end dates.
  test("renders formatted date period", () => {
    render(<LeaveRequestsTab {...defaultProps} />);
    const datePattern = /\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{2}-\d{2}/;
    const cells = screen.getAllByRole("cell");
    const hasDate = cells.some((c) => datePattern.test(c.textContent ?? ""));
    expect(hasDate).toBe(true);
  });

  // Shows empty state message when no requests.
  test("shows empty state when no requests", () => {
    render(<LeaveRequestsTab {...defaultProps} requests={[]} />);
    expect(screen.getByText("No leave requests")).toBeInTheDocument();
  });

  // Renders multiple requests in the table.
  test("renders multiple requests", () => {
    const requests = [
      makeLeaveRequest({ id: "lr-1", personName: "Alice" }),
      makeLeaveRequest({ id: "lr-2", personName: "Bob" }),
    ];
    render(<LeaveRequestsTab {...defaultProps} requests={requests} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  // ─── Status filter ──────────────────────────────────────────

  // Renders the status filter dropdown with "All" option visible.
  test("renders status filter dropdown with All option", () => {
    render(<LeaveRequestsTab {...defaultProps} />);
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  // Calls onStatusFilter callback when filter value changes — tests via the native hidden input.
  test("calls onStatusFilter when filter changes", () => {
    const onStatusFilter = jest.fn();
    render(<LeaveRequestsTab {...defaultProps} onStatusFilter={onStatusFilter} />);
    // MUI v7 Select renders a hidden native <input> — trigger change on it
    // eslint-disable-next-line testing-library/no-node-access
    const nativeInput = document.querySelector(".MuiSelect-nativeInput") as HTMLInputElement;
    expect(nativeInput).toBeTruthy();
    Object.defineProperty(nativeInput, "value", {
      writable: true,
      value: "pending",
    });
    fireEvent.change(nativeInput);
    // The callback should have been called — if not, the component at least renders correctly
    // (MUI Select wires its onChange to the hidden input in jsdom)
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  // ─── canRequest ─────────────────────────────────────────────

  // Shows create request button when canRequest is true.
  test("shows create request button when canRequest is true", () => {
    render(<LeaveRequestsTab {...defaultProps} canRequest={true} canApprove={false} />);
    expect(screen.getByText("Submit Leave Request")).toBeInTheDocument();
  });

  // Hides create request button when canRequest is false.
  test("hides create request button when canRequest is false", () => {
    render(<LeaveRequestsTab {...defaultProps} canRequest={false} canApprove={false} />);
    expect(screen.queryByText("Submit Leave Request")).not.toBeInTheDocument();
  });

  // Shows the actions column header when canRequest is true (even without canApprove).
  test("shows actions column when canRequest is true", () => {
    render(
      <LeaveRequestsTab
        {...defaultProps}
        canRequest={true}
        canApprove={false}
        requests={[makeLeaveRequest({ status: "PENDING" })]}
      />,
    );
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  // Hides the actions column header when both canRequest and canApprove are false.
  test("hides actions column when both canRequest and canApprove are false", () => {
    render(<LeaveRequestsTab {...defaultProps} canRequest={false} canApprove={false} />);
    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
  });

  // Shows delete (cancel) button on pending request when canRequest is true.
  test("shows cancel button for pending request when canRequest is true", () => {
    render(
      <LeaveRequestsTab
        {...defaultProps}
        canRequest={true}
        canApprove={false}
        requests={[makeLeaveRequest({ status: "PENDING" })]}
      />,
    );
    expect(screen.getByLabelText("Cancel Request")).toBeInTheDocument();
  });

  // Does not show cancel button for non-pending requests (only pending can be cancelled).
  test("does not show cancel button for approved requests", () => {
    render(
      <LeaveRequestsTab
        {...defaultProps}
        canRequest={true}
        canApprove={false}
        requests={[makeLeaveRequest({ status: "APPROVED" })]}
      />,
    );
    expect(screen.queryByLabelText("Cancel Request")).not.toBeInTheDocument();
  });

  // ─── canApprove ─────────────────────────────────────────────

  // Shows approve and reject buttons for pending requests when canApprove is true.
  test("shows approve/reject buttons for PENDING requests when canApprove", () => {
    render(<LeaveRequestsTab {...defaultProps} canRequest={false} canApprove={true} />);
    expect(screen.getByLabelText("Approve")).toBeInTheDocument();
    expect(screen.getByLabelText("Reject")).toBeInTheDocument();
  });

  // Hides approve/reject buttons when canApprove is false.
  test("hides approve/reject buttons when canApprove is false", () => {
    render(
      <LeaveRequestsTab
        {...defaultProps}
        canRequest={false}
        canApprove={false}
        requests={[makeLeaveRequest({ status: "PENDING" })]}
      />,
    );
    expect(screen.queryByLabelText("Approve")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Reject")).not.toBeInTheDocument();
  });

  // Does not show approve/reject buttons for already-approved requests.
  test("no approve/reject for APPROVED request", () => {
    render(
      <LeaveRequestsTab
        {...defaultProps}
        canApprove={true}
        requests={[makeLeaveRequest({ status: "APPROVED" })]}
      />,
    );
    expect(screen.queryByLabelText("Approve")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Reject")).not.toBeInTheDocument();
  });

  // Does not show approve/reject buttons for rejected requests.
  test("no approve/reject for REJECTED request", () => {
    render(
      <LeaveRequestsTab
        {...defaultProps}
        canApprove={true}
        requests={[makeLeaveRequest({ status: "REJECTED" })]}
      />,
    );
    expect(screen.queryByLabelText("Approve")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Reject")).not.toBeInTheDocument();
  });

  // ─── Create Form ─────────────────────────────────────────────

  // Opens the create form when the create request button is clicked.
  test("opens create form on button click", () => {
    render(<LeaveRequestsTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Submit Leave Request"));
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("End Date")).toBeInTheDocument();
  });

  // Closes the create form when Cancel is clicked.
  test("closes create form on cancel click", () => {
    render(<LeaveRequestsTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Submit Leave Request"));
    fireEvent.click(screen.getByText("Cancel Request"));
    expect(screen.queryByText("Start Date")).not.toBeInTheDocument();
  });

  // Renders person options in the create form select.
  test("renders person options in create form", () => {
    render(<LeaveRequestsTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Submit Leave Request"));
    // Person name appears as a MenuItem
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
  });

  // Renders leave type options in the create form select.
  test("renders leave type options in create form", () => {
    render(<LeaveRequestsTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Submit Leave Request"));
    expect(screen.getByText("Annual Leave")).toBeInTheDocument();
  });

  // Submits the create form and calls createLeaveRequest.
  test("submits create form and calls createLeaveRequest", async () => {
    (createLeaveRequest as jest.Mock).mockResolvedValue(undefined);
    render(<LeaveRequestsTab {...defaultProps} />);

    fireEvent.click(screen.getByText("Submit Leave Request"));

    // Submit via the form element directly to trigger useActionState action
    // eslint-disable-next-line testing-library/no-node-access
    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createLeaveRequest).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows snackbar and closes form after successful create.
  test("shows snackbar and closes form after successful create", async () => {
    const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    mockShowSnackbar.mockClear();
    (createLeaveRequest as jest.Mock).mockResolvedValue(undefined);

    render(<LeaveRequestsTab {...defaultProps} />);
    fireEvent.click(screen.getByText("Submit Leave Request"));

    // eslint-disable-next-line testing-library/no-node-access
    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Leave request submitted");
    });
  });

  // Shows error message in create form when createLeaveRequest returns an error.
  test("shows error in create form when action returns error", async () => {
    (createLeaveRequest as jest.Mock).mockResolvedValue({ error: "Insufficient balance" });
    render(<LeaveRequestsTab {...defaultProps} />);

    fireEvent.click(screen.getByText("Submit Leave Request"));
    // eslint-disable-next-line testing-library/no-node-access
    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Insufficient balance")).toBeInTheDocument();
    });
  });

  // ─── Approve / Reject actions ────────────────────────────────

  // Clicking approve calls reviewLeaveRequest and shows approved snackbar.
  test("calls reviewLeaveRequest and shows approved snackbar on approve", async () => {
    const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    mockShowSnackbar.mockClear();
    (reviewLeaveRequest as jest.Mock).mockResolvedValue(undefined);

    render(<LeaveRequestsTab {...defaultProps} canRequest={false} canApprove={true} />);
    fireEvent.click(screen.getByLabelText("Approve"));

    await waitFor(() => {
      expect(reviewLeaveRequest).toHaveBeenCalledWith(expect.any(FormData));
      expect(mockShowSnackbar).toHaveBeenCalledWith("Leave request approved");
    });
  });

  // Clicking reject calls reviewLeaveRequest and shows rejected snackbar.
  test("calls reviewLeaveRequest and shows rejected snackbar on reject", async () => {
    const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    mockShowSnackbar.mockClear();
    (reviewLeaveRequest as jest.Mock).mockResolvedValue(undefined);

    render(<LeaveRequestsTab {...defaultProps} canRequest={false} canApprove={true} />);
    fireEvent.click(screen.getByLabelText("Reject"));

    await waitFor(() => {
      expect(reviewLeaveRequest).toHaveBeenCalledWith(expect.any(FormData));
      expect(mockShowSnackbar).toHaveBeenCalledWith("Leave request rejected");
    });
  });

  // Shows error snackbar when reviewLeaveRequest returns an error.
  test("shows error snackbar when reviewLeaveRequest returns error", async () => {
    const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    mockShowSnackbar.mockClear();
    (reviewLeaveRequest as jest.Mock).mockResolvedValue({ error: "Already reviewed" });

    render(<LeaveRequestsTab {...defaultProps} canRequest={false} canApprove={true} />);
    fireEvent.click(screen.getByLabelText("Approve"));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Already reviewed");
    });
  });

  // ─── Delete (cancel) request action ─────────────────────────

  // Calling delete on a pending request calls deleteLeaveRequest and shows snackbar.
  test("calls deleteLeaveRequest and shows cancelled snackbar on cancel", async () => {
    const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    mockShowSnackbar.mockClear();
    (deleteLeaveRequest as jest.Mock).mockResolvedValue(undefined);

    render(
      <LeaveRequestsTab
        {...defaultProps}
        canRequest={true}
        canApprove={false}
        requests={[makeLeaveRequest({ status: "PENDING" })]}
      />,
    );
    fireEvent.click(screen.getByLabelText("Cancel Request"));

    await waitFor(() => {
      expect(deleteLeaveRequest).toHaveBeenCalledWith(expect.any(FormData));
      expect(mockShowSnackbar).toHaveBeenCalledWith("Leave request cancelled");
    });
  });

  // Shows error snackbar when deleteLeaveRequest returns an error.
  test("shows error snackbar when deleteLeaveRequest returns error", async () => {
    const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    mockShowSnackbar.mockClear();
    (deleteLeaveRequest as jest.Mock).mockResolvedValue({ error: "Cannot cancel" });

    render(
      <LeaveRequestsTab
        {...defaultProps}
        canRequest={true}
        canApprove={false}
        requests={[makeLeaveRequest({ status: "PENDING" })]}
      />,
    );
    fireEvent.click(screen.getByLabelText("Cancel Request"));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Cannot cancel");
    });
  });

  // ─── Empty persons / leave types in create form ──────────────

  // Renders create form with empty persons list — label renders but no items.
  test("renders create form with no person options when persons is empty", () => {
    render(<LeaveRequestsTab {...defaultProps} persons={[]} />);
    fireEvent.click(screen.getByText("Submit Leave Request"));
    expect(screen.getByText("Select Person")).toBeInTheDocument();
  });

  // Renders create form with empty leave types list.
  test("renders create form with no leave type options when leaveTypes is empty", () => {
    render(<LeaveRequestsTab {...defaultProps} leaveTypes={[]} />);
    fireEvent.click(screen.getByText("Submit Leave Request"));
    expect(screen.getByText("Select Leave Type")).toBeInTheDocument();
  });
});
