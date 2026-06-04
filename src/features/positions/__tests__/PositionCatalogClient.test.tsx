import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PositionCatalogClient from "@/features/positions/components/PositionCatalogClient";
import { createPositionEntry, deletePositionEntry } from "@/features/positions/actions";
import type { Position, Permissions } from "@/schemas";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/features/positions/actions", () => ({
  createPositionEntry: jest.fn(),
  deletePositionEntry: jest.fn(),
}));

// SnackbarProvider is mocked globally in jest.setup.ts — use the shared global reference.
const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;

// Mock next-auth — not used in this component but required by module graph.
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null }),
}));

const NOW = new Date("2026-01-01T00:00:00Z");

const makePosition = (overrides: Partial<Position> = {}): Position => ({
  id: "00000000-0000-0000-0000-000000000001",
  name: "Software Engineer",
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const adminPerms: Permissions = { "position:manage": true };
const guestPerms: Permissions = { "position:manage": false };

function renderCatalog(positions: Position[], permissions: Permissions) {
  return render(<PositionCatalogClient positions={positions} permissions={permissions} />);
}

// ─── PositionCatalogClient ────────────────────────────────────

describe("PositionCatalogClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders the heading from the positions namespace — resolves to English "Position Catalog".
  test("renders the Position Catalog heading", () => {
    renderCatalog([], adminPerms);
    expect(screen.getByText("Position Catalog")).toBeInTheDocument();
  });

  // Shows empty state message when no positions exist — resolves to English text.
  test("shows empty state message when positions list is empty", () => {
    renderCatalog([], adminPerms);
    expect(screen.getByText("No positions in the catalog yet.")).toBeInTheDocument();
  });

  // Renders a position name in the table.
  test("renders position names from the catalog", () => {
    renderCatalog([makePosition({ name: "Product Manager" })], adminPerms);
    expect(screen.getByText("Product Manager")).toBeInTheDocument();
  });

  // Shows the Add Position button when the user has position:manage permission — resolves to English text.
  test("shows Add Position button when user has position:manage", () => {
    renderCatalog([], adminPerms);
    expect(screen.getByText("Add Position")).toBeInTheDocument();
  });

  // Hides the Add Position button when the user lacks position:manage permission.
  test("hides Add Position button when user lacks position:manage", () => {
    renderCatalog([], guestPerms);
    expect(screen.queryByText("Add Position")).not.toBeInTheDocument();
  });

  // Shows delete button for each position when user has position:manage — aria-label resolves to English text.
  test("renders a delete button for each position when user has position:manage", () => {
    const positions = [
      makePosition({ id: "00000000-0000-0000-0000-000000000001", name: "Designer" }),
      makePosition({ id: "00000000-0000-0000-0000-000000000002", name: "Engineer" }),
    ];
    renderCatalog(positions, adminPerms);
    const deleteButtons = screen.getAllByLabelText("Delete Position");
    expect(deleteButtons).toHaveLength(2);
  });

  // Hides delete buttons when the user lacks position:manage permission.
  test("hides delete buttons when user lacks position:manage", () => {
    renderCatalog([makePosition()], guestPerms);
    expect(screen.queryByLabelText("Delete Position")).not.toBeInTheDocument();
  });

  // ─── Create Form Show/Hide ────────────────────────────────

  // Clicking Add Position shows the create form.
  test("clicking Add Position reveals the create form", () => {
    renderCatalog([], adminPerms);
    expect(screen.queryByRole("textbox", { name: /Position Name/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Add Position"));
    expect(screen.getByRole("textbox", { name: /Position Name/i })).toBeInTheDocument();
  });

  // Clicking Cancel inside the create form hides the form again.
  test("clicking Cancel hides the create form", () => {
    renderCatalog([], adminPerms);
    fireEvent.click(screen.getByText("Add Position"));
    expect(screen.getByRole("textbox", { name: /Position Name/i })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("textbox", { name: /Position Name/i })).not.toBeInTheDocument();
  });

  // The create form is not shown initially before clicking Add Position.
  test("create form is hidden initially", () => {
    renderCatalog([], adminPerms);
    expect(screen.queryByRole("textbox", { name: /Position Name/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Create")).not.toBeInTheDocument();
  });

  // ─── Create Form Submission ───────────────────────────────

  // Submitting the create form calls createPositionEntry.
  test("submitting the create form calls createPositionEntry", async () => {
    (createPositionEntry as jest.Mock).mockResolvedValue(undefined);
    const { container } = renderCatalog([], adminPerms);
    fireEvent.click(screen.getByText("Add Position"));
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(createPositionEntry as jest.Mock).toHaveBeenCalled();
    });
  });

  // Successful create shows "Position added to catalog" snackbar and hides the form.
  test("successful create shows snackbar and hides form", async () => {
    (createPositionEntry as jest.Mock).mockResolvedValue(undefined);
    const { container } = renderCatalog([], adminPerms);
    fireEvent.click(screen.getByText("Add Position"));
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Position added to catalog");
    });
    expect(screen.queryByRole("textbox", { name: /Position Name/i })).not.toBeInTheDocument();
  });

  // Create action returning an error shows the error message and keeps the form open.
  test("create error shows error alert and keeps form open", async () => {
    (createPositionEntry as jest.Mock).mockResolvedValue({ error: "Position name already exists" });
    const { container } = renderCatalog([], adminPerms);
    fireEvent.click(screen.getByText("Add Position"));
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Position name already exists")).toBeInTheDocument();
    });
    // Form stays open on error.
    expect(screen.getByRole("textbox", { name: /Position Name/i })).toBeInTheDocument();
  });

  // ─── Delete Dialog ────────────────────────────────────────

  // Clicking the delete icon opens the delete confirmation dialog.
  test("clicking delete icon opens the delete confirmation dialog", () => {
    renderCatalog([makePosition({ name: "Designer" })], adminPerms);
    fireEvent.click(screen.getByLabelText("Delete Position"));
    expect(screen.getByText("Delete this position from the catalog?")).toBeInTheDocument();
  });

  // Clicking Cancel in the delete dialog does not call deletePositionEntry.
  test("cancel in delete dialog does not call deletePositionEntry", () => {
    renderCatalog([makePosition()], adminPerms);
    fireEvent.click(screen.getByLabelText("Delete Position"));
    expect(screen.getByText("Delete this position from the catalog?")).toBeInTheDocument();
    // The cancel button in the dialog — grab last Cancel button (inside dialog).
    const cancelButtons = screen.getAllByText("Cancel");
    fireEvent.click(cancelButtons[cancelButtons.length - 1]);
    // The delete action must not have been invoked.
    expect(deletePositionEntry as jest.Mock).not.toHaveBeenCalled();
  });

  // Confirming delete calls deletePositionEntry and shows the success snackbar.
  test("confirming delete calls deletePositionEntry and shows success snackbar", async () => {
    (deletePositionEntry as jest.Mock).mockResolvedValue(undefined);
    renderCatalog([makePosition({ id: "pos-1" })], adminPerms);
    fireEvent.click(screen.getByLabelText("Delete Position"));
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => {
      expect(deletePositionEntry as jest.Mock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Position removed from catalog");
    });
  });

  // Delete action returning an error shows the error via snackbar.
  test("delete error shows error snackbar", async () => {
    (deletePositionEntry as jest.Mock).mockResolvedValue({
      error: "Cannot delete — position is in use",
    });
    renderCatalog([makePosition()], adminPerms);
    fireEvent.click(screen.getByLabelText("Delete Position"));
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Cannot delete — position is in use");
    });
  });

  // ─── Multiple Positions ───────────────────────────────────

  // Renders multiple positions correctly in the table.
  test("renders multiple positions in the table", () => {
    const positions = [
      makePosition({ id: "p1", name: "Engineer" }),
      makePosition({ id: "p2", name: "Designer" }),
      makePosition({ id: "p3", name: "Product Manager" }),
    ];
    renderCatalog(positions, adminPerms);
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("Designer")).toBeInTheDocument();
    expect(screen.getByText("Product Manager")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Delete Position")).toHaveLength(3);
  });

  // Guest users see position names but no delete buttons.
  test("guest users see position names but no delete buttons", () => {
    const positions = [
      makePosition({ id: "p1", name: "Engineer" }),
      makePosition({ id: "p2", name: "Designer" }),
    ];
    renderCatalog(positions, guestPerms);
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("Designer")).toBeInTheDocument();
    expect(screen.queryByLabelText("Delete Position")).not.toBeInTheDocument();
  });
});
