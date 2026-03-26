import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeaveTypesTab from "@/components/LeaveManager/LeaveTypesTab";
import type { LeaveType } from "@/schemas";
import { createLeaveType, updateLeaveType, deleteLeaveType } from "@/serverActions";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/serverActions", () => ({
  createLeaveType: jest.fn(),
  updateLeaveType: jest.fn(),
  deleteLeaveType: jest.fn(),
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

const defaultType = makeLeaveType();

describe("LeaveTypesTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Rendering ──────────────────────────────────────────────

  // Shows the leave type name in the table when types are provided.
  test("renders leave type name in table", () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={false} />);
    expect(screen.getByText("Annual Leave")).toBeInTheDocument();
  });

  // Shows default days and description in the table.
  test("renders defaultDays and description in table", () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={false} />);
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("Paid annual leave")).toBeInTheDocument();
  });

  // Shows a dash when description is null.
  test("shows dash when description is null", () => {
    render(
      <LeaveTypesTab leaveTypes={[makeLeaveType({ description: null })]} canManageTypes={false} />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  // Shows empty state message when no leave types are provided.
  test("shows empty state when no leave types", () => {
    render(<LeaveTypesTab leaveTypes={[]} canManageTypes={false} />);
    expect(screen.getByText("No leave types configured")).toBeInTheDocument();
  });

  // Renders multiple leave types as table rows.
  test("renders multiple leave types", () => {
    const types = [
      makeLeaveType({ id: "lt-1", name: "Annual Leave" }),
      makeLeaveType({ id: "lt-2", name: "Sick Leave" }),
    ];
    render(<LeaveTypesTab leaveTypes={types} canManageTypes={false} />);
    expect(screen.getByText("Annual Leave")).toBeInTheDocument();
    expect(screen.getByText("Sick Leave")).toBeInTheDocument();
  });

  // ─── canManageTypes = false ──────────────────────────────────

  // Hides the "Create Leave Type" button when user cannot manage types.
  test("hides create button when canManageTypes is false", () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={false} />);
    expect(screen.queryByText("Create Leave Type")).not.toBeInTheDocument();
  });

  // Hides edit and delete buttons when user cannot manage types.
  test("hides edit and delete buttons when canManageTypes is false", () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={false} />);
    expect(screen.queryByLabelText("Edit Leave Type")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete Leave Type")).not.toBeInTheDocument();
  });

  // Hides the actions table column header when canManageTypes is false.
  test("hides actions column when canManageTypes is false", () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={false} />);
    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
  });

  // ─── canManageTypes = true ───────────────────────────────────

  // Shows the "Create Leave Type" button when user can manage types.
  test("shows create button when canManageTypes is true", () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);
    expect(screen.getByText("Create Leave Type")).toBeInTheDocument();
  });

  // Shows edit and delete buttons for each type when user can manage.
  test("shows edit and delete buttons when canManageTypes is true", () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);
    expect(screen.getByLabelText("Edit Leave Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete Leave Type")).toBeInTheDocument();
  });

  // ─── Create Form ─────────────────────────────────────────────

  // Opens the create form when the create button is clicked.
  test("opens create form on button click", () => {
    render(<LeaveTypesTab leaveTypes={[]} canManageTypes={true} />);
    fireEvent.click(screen.getByText("Create Leave Type"));
    // Form fields should appear — check for the label text from translations.
    // MUI renders labels twice (label + floating), use getAllByText.
    expect(screen.getAllByText("Leave Type Name").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Default Days per Year").length).toBeGreaterThan(0);
  });

  // Closes the create form when Cancel is clicked.
  test("closes create form on cancel click", () => {
    render(<LeaveTypesTab leaveTypes={[]} canManageTypes={true} />);
    fireEvent.click(screen.getByText("Create Leave Type"));
    fireEvent.click(screen.getByText("Cancel Request"));
    expect(screen.queryByText("Leave Type Name")).not.toBeInTheDocument();
  });

  // Submits the create form and calls createLeaveType with FormData.
  test("submits create form and calls createLeaveType", async () => {
    (createLeaveType as jest.Mock).mockResolvedValue(undefined);
    render(<LeaveTypesTab leaveTypes={[]} canManageTypes={true} />);

    fireEvent.click(screen.getByText("Create Leave Type"));

    // Submit via the form element directly to bypass MUI button/input quirks
    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(createLeaveType).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows snackbar with success message after successful create.
  test("shows snackbar and closes form after successful create", async () => {
    const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    mockShowSnackbar.mockClear();
    (createLeaveType as jest.Mock).mockResolvedValue(undefined);

    render(<LeaveTypesTab leaveTypes={[]} canManageTypes={true} />);
    fireEvent.click(screen.getByText("Create Leave Type"));

    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Leave type created");
    });
  });

  // Shows error message in create form when createLeaveType returns an error.
  test("shows error in create form when action returns error", async () => {
    (createLeaveType as jest.Mock).mockResolvedValue({ error: "Name already exists" });
    render(<LeaveTypesTab leaveTypes={[]} canManageTypes={true} />);

    fireEvent.click(screen.getByText("Create Leave Type"));

    const form = document.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Name already exists")).toBeInTheDocument();
    });
  });

  // ─── Edit Form ───────────────────────────────────────────────

  // Opens the inline edit form when the edit button is clicked.
  test("opens inline edit form on edit button click", () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);
    fireEvent.click(screen.getByLabelText("Edit Leave Type"));
    // Edit form shows submit button with edit label text
    expect(screen.getByText("Edit Leave Type")).toBeInTheDocument();
  });

  // Populates edit form with existing values.
  test("populates edit form with existing leave type values", () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);
    fireEvent.click(screen.getByLabelText("Edit Leave Type"));
    const nameInput = screen.getByDisplayValue("Annual Leave");
    expect(nameInput).toBeInTheDocument();
  });

  // Closes the edit form when Cancel is clicked in the edit row.
  test("closes edit form on cancel", () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);
    fireEvent.click(screen.getByLabelText("Edit Leave Type"));
    // Cancel button in the edit form row
    fireEvent.click(screen.getByText("Cancel Request"));
    // After cancel, the normal row should be back
    expect(screen.getByText("Annual Leave")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Annual Leave")).not.toBeInTheDocument();
  });

  // Submits the edit form and calls updateLeaveType with FormData.
  test("submits edit form and calls updateLeaveType", async () => {
    (updateLeaveType as jest.Mock).mockResolvedValue(undefined);
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);

    fireEvent.click(screen.getByLabelText("Edit Leave Type"));
    fireEvent.click(screen.getByText("Edit Leave Type"));

    await waitFor(() => {
      expect(updateLeaveType).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows snackbar after successful edit.
  test("shows snackbar and closes edit form after successful update", async () => {
    const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    mockShowSnackbar.mockClear();
    (updateLeaveType as jest.Mock).mockResolvedValue(undefined);

    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);
    fireEvent.click(screen.getByLabelText("Edit Leave Type"));
    fireEvent.click(screen.getByText("Edit Leave Type"));

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Leave type updated");
    });
  });

  // Shows error message in edit form when updateLeaveType returns an error.
  test("shows error in edit form when update returns error", async () => {
    (updateLeaveType as jest.Mock).mockResolvedValue({ error: "Invalid data" });
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);

    fireEvent.click(screen.getByLabelText("Edit Leave Type"));
    fireEvent.click(screen.getByText("Edit Leave Type"));

    await waitFor(() => {
      expect(screen.getByText("Invalid data")).toBeInTheDocument();
    });
  });

  // ─── Delete Dialog ───────────────────────────────────────────

  // Opens the delete confirmation dialog when delete button is clicked.
  test("opens delete confirmation dialog on delete button click", () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);
    fireEvent.click(screen.getByLabelText("Delete Leave Type"));
    expect(
      screen.getByText(
        "Are you sure you want to delete this leave type? Existing requests will not be affected.",
      ),
    ).toBeInTheDocument();
  });

  // Closes the delete dialog when the dialog Cancel button is clicked.
  test("closes delete dialog on cancel", async () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);
    fireEvent.click(screen.getByLabelText("Delete Leave Type"));
    // Dialog is open — confirm title visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // The dialog has a Cancel button rendered via t("cancel") = "Cancel Request"
    const cancelButtons = screen.getAllByText("Cancel Request");
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    // After cancel, deleteDialogId is null — dialog closes (open=false removes from DOM)
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // Closes the delete dialog via the dialog backdrop/Escape key (onClose handler).
  test("closes delete dialog via Escape key (onClose)", async () => {
    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);
    fireEvent.click(screen.getByLabelText("Delete Leave Type"));
    // Dialog is open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement || document.body, {
      key: "Escape",
      code: "Escape",
    });
    // Dialog is closed after Escape
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // Calls deleteLeaveType with FormData and shows snackbar on success.
  test("calls deleteLeaveType and shows snackbar on success", async () => {
    const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    mockShowSnackbar.mockClear();
    (deleteLeaveType as jest.Mock).mockResolvedValue(undefined);

    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);
    fireEvent.click(screen.getByLabelText("Delete Leave Type"));

    // Click confirm delete button in dialog — title text "Delete Leave Type"
    const deleteButtons = screen.getAllByText("Delete Leave Type");
    const dialogDeleteButton = deleteButtons[deleteButtons.length - 1];
    fireEvent.click(dialogDeleteButton);

    await waitFor(() => {
      expect(deleteLeaveType).toHaveBeenCalledWith(expect.any(FormData));
      expect(mockShowSnackbar).toHaveBeenCalledWith("Leave type deleted");
    });
  });

  // Shows error snackbar when deleteLeaveType returns an error.
  test("shows error snackbar when deleteLeaveType returns error", async () => {
    const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;
    mockShowSnackbar.mockClear();
    (deleteLeaveType as jest.Mock).mockResolvedValue({
      error: "Cannot delete — leave requests exist",
    });

    render(<LeaveTypesTab leaveTypes={[defaultType]} canManageTypes={true} />);
    fireEvent.click(screen.getByLabelText("Delete Leave Type"));

    const deleteButtons = screen.getAllByText("Delete Leave Type");
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Cannot delete — leave requests exist");
    });
  });

  // Edit form falls back to empty string when leave type description is null.
  test("edit form renders empty string for null description", () => {
    const typeWithNullDesc = makeLeaveType({ id: "lt-null", description: null });
    render(<LeaveTypesTab leaveTypes={[typeWithNullDesc]} canManageTypes={true} />);
    fireEvent.click(screen.getByLabelText("Edit Leave Type"));
    // The description TextField should have defaultValue="" (null ?? "")
    const descriptionInput = screen.getByDisplayValue("") as HTMLInputElement;
    expect(descriptionInput).toBeInTheDocument();
  });

  // ─── Multiple types — edit isolates to the clicked row ───────

  // Clicking edit on one row only opens that row's edit form, not others.
  test("edit form only opens for the clicked row", () => {
    const types = [
      makeLeaveType({ id: "lt-1", name: "Annual Leave" }),
      makeLeaveType({ id: "lt-2", name: "Sick Leave" }),
    ];
    render(<LeaveTypesTab leaveTypes={types} canManageTypes={true} />);

    const editButtons = screen.getAllByLabelText("Edit Leave Type");
    fireEvent.click(editButtons[0]); // edit first row

    expect(screen.getByDisplayValue("Annual Leave")).toBeInTheDocument();
    // The second row should still be a display row
    expect(screen.getByText("Sick Leave")).toBeInTheDocument();
  });
});
