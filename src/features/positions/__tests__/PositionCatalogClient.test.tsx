import { render, screen } from "@testing-library/react";
import PositionCatalogClient from "@/features/positions/components/PositionCatalogClient";
import type { Position, Permissions } from "@/schemas";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/features/positions/actions", () => ({
  createPositionEntry: jest.fn(),
  deletePositionEntry: jest.fn(),
}));

// Mock the snackbar provider — captures snackbar calls.
const mockShowSnackbar = jest.fn();
jest.mock("@/components/shared/SnackbarProvider", () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));

// Mock next-auth — not used in this component but required by module graph.
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: null }),
}));

const NOW = new Date("2026-01-01T00:00:00Z");

const makePosition = (overrides: Partial<Position> = {}): Position => ({
  id: "00000000-0000-0000-0000-000000000001",
  name: "Software Engineer",
  sessionId: null,
  createdAt: NOW,
  ...overrides,
});

const adminPerms: Permissions = { "position:manage": true };
const guestPerms: Permissions = { "position:manage": false };

function renderCatalog(positions: Position[], permissions: Permissions) {
  return render(<PositionCatalogClient positions={positions} permissions={permissions} />);
}

// ─── PositionCatalogClient ────────────────────────────────────

describe("PositionCatalogClient", () => {
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
});
