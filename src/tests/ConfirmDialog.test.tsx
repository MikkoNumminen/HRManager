import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

const defaultProps = {
  open: true,
  title: "Delete item?",
  message: "This action cannot be undone.",
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

describe("ConfirmDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  // When the dialog is open, you should see the title and message on screen.
  test("renders title and message when open", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  });

  // If no one passes a custom label, the confirm button should say "Confirm".
  test('shows default "Confirm" label when confirmLabel is not provided', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  // You can customize what the confirm button says — like "Delete" or "Yes, remove".
  test("shows custom confirmLabel when provided", () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Delete Forever" />);
    expect(screen.getByText("Delete Forever")).toBeInTheDocument();
  });

  // Clicking the Cancel button should call the onCancel handler.
  test("calls onCancel when Cancel button is clicked", async () => {
    render(<ConfirmDialog {...defaultProps} />);
    await userEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  // Clicking the Confirm button should call the onConfirm handler.
  test("calls onConfirm when Confirm button is clicked", async () => {
    render(<ConfirmDialog {...defaultProps} />);
    await userEvent.click(screen.getByText("Confirm"));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  // Both Cancel and Confirm buttons should always be visible in the dialog.
  test("renders both Cancel and Confirm buttons", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  // When the dialog is closed (open=false), nothing should be visible on screen.
  test("does not render content when open is false", () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Delete item?")).not.toBeInTheDocument();
  });
});
