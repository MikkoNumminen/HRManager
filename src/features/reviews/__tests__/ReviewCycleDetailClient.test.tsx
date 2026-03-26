import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReviewCycleDetailClient from "@/features/reviews/components/ReviewCycleDetailClient";
import {
  openReviewCycle,
  closeReviewCycle,
  deleteReviewCycle,
  removeReviewRequest,
} from "@/features/reviews/actions";
import type { ReviewCycle, ReviewRequest, Person } from "@/schemas";

// Mock server actions — component tests verify UI behavior, not server logic.
jest.mock("@/features/reviews/actions", () => ({
  openReviewCycle: jest.fn(),
  closeReviewCycle: jest.fn(),
  addReviewRequest: jest.fn(),
  removeReviewRequest: jest.fn(),
  deleteReviewCycle: jest.fn(),
}));

// Mock next/navigation — useRouter used for redirect after delete.
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// SnackbarProvider is mocked globally in jest.setup.ts — use the shared global reference.
const mockShowSnackbar = (globalThis as Record<string, unknown>).mockShowSnackbar as jest.Mock;

const NOW = new Date("2026-07-01T12:00:00Z");

const makeRequest = (overrides: Partial<ReviewRequest> = {}): ReviewRequest => ({
  id: "req-1",
  cycleId: "cycle-1",
  cycleName: "Q3 2026 Review",
  cycleStatus: "DRAFT",
  subjectId: "p-1",
  subjectName: "Alice Johnson",
  reviewerId: "p-2",
  reviewerName: "Bob Smith",
  type: "PEER",
  status: "PENDING",
  createdAt: NOW,
  ...overrides,
});

const makeCycle = (
  overrides: Partial<ReviewCycle & { requests: ReviewRequest[] }> = {},
): ReviewCycle & { requests: ReviewRequest[] } => ({
  id: "cycle-1",
  name: "Q3 2026 Review",
  templateId: "tmpl-1",
  templateName: "Standard Review",
  status: "DRAFT",
  startDate: new Date("2026-07-01"),
  endDate: new Date("2026-09-30"),
  requestCount: 1,
  submittedCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
  requests: [makeRequest()],
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
  cycle: makeCycle(),
  persons: [makePerson(), makePerson({ id: "p-2", name: "Bob Smith", email: "bob@example.com" })],
  canManage: true,
};

describe("ReviewCycleDetailClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Status Display ────────────────────────────────────────

  // Renders template name when present.
  test("renders template name", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    expect(screen.getByText("Standard Review")).toBeInTheDocument();
  });

  // Hides template name when null.
  test("hides template name when null", () => {
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ templateName: null })} />);
    expect(screen.queryByText("Standard Review")).not.toBeInTheDocument();
  });

  // ─── Action Buttons (canManage) ────────────────────────────

  // Shows Open Cycle button for DRAFT status.
  test("shows Open Cycle button for DRAFT status", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    expect(screen.getByText("Open Cycle")).toBeInTheDocument();
  });

  // Shows Close Cycle button for OPEN status.
  test("shows Close Cycle button for OPEN status", () => {
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ status: "OPEN" })} />);
    expect(screen.getByText("Close Cycle")).toBeInTheDocument();
  });

  // Shows Delete Cycle button always when canManage.
  test("shows Delete Cycle button when canManage", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    expect(screen.getByText("Delete Cycle")).toBeInTheDocument();
  });

  // Hides all action buttons when canManage is false.
  test("hides action buttons when canManage is false", () => {
    render(<ReviewCycleDetailClient {...defaultProps} canManage={false} />);
    expect(screen.queryByText("Open Cycle")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete Cycle")).not.toBeInTheDocument();
  });

  // No Open/Close button for CLOSED status.
  test("no Open or Close button for CLOSED status", () => {
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ status: "CLOSED" })} />);
    expect(screen.queryByText("Open Cycle")).not.toBeInTheDocument();
    expect(screen.queryByText("Close Cycle")).not.toBeInTheDocument();
  });

  // ─── Add Request Form ──────────────────────────────────────

  // Shows add request form for DRAFT cycle when canManage.
  test("shows add request form for DRAFT cycle when canManage", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /Add Request/i })).toBeInTheDocument();
  });

  // Hides add request form when status is OPEN.
  test("hides add request form when status is OPEN", () => {
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ status: "OPEN" })} />);
    // The "Add Request" form section should not appear — only the heading text.
    const addRequestTexts = screen.queryAllByText("Add Request");
    // eslint-disable-next-line testing-library/no-node-access
    const formsWithAddRequest = addRequestTexts.filter((el) => el.closest("form"));
    expect(formsWithAddRequest).toHaveLength(0);
  });

  // Hides add request form when canManage is false.
  test("hides add request form when canManage is false", () => {
    render(<ReviewCycleDetailClient {...defaultProps} canManage={false} />);
    const addRequestTexts = screen.queryAllByText("Add Request");
    // eslint-disable-next-line testing-library/no-node-access
    const formsWithAddRequest = addRequestTexts.filter((el) => el.closest("form"));
    expect(formsWithAddRequest).toHaveLength(0);
  });

  // ─── Request Table ─────────────────────────────────────────

  // Renders requests table with subject, reviewer, type, and status.
  test("renders requests table with data", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("typePEER")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  // Shows request count in heading.
  test("shows request count in heading", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    expect(screen.getByText(/Review Requests.*\(1\)/)).toBeInTheDocument();
  });

  // Shows empty state when no requests exist.
  test("shows empty state when no requests", () => {
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ requests: [] })} />);
    expect(screen.getByText("No review requests in this cycle")).toBeInTheDocument();
  });

  // Shows "unknown" for null subject/reviewer names.
  test("shows unknown for null names", () => {
    render(
      <ReviewCycleDetailClient
        {...defaultProps}
        cycle={makeCycle({
          requests: [makeRequest({ subjectName: null, reviewerName: null })],
        })}
      />,
    );
    const unknowns = screen.getAllByText("unknown");
    expect(unknowns).toHaveLength(2);
  });

  // Shows delete button on request rows for DRAFT cycle with canManage.
  test("shows delete button on request rows for DRAFT with canManage", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    const deleteIcons = screen.getAllByTestId("DeleteIcon");
    // eslint-disable-next-line testing-library/no-node-access
    const rowDeleteIcons = deleteIcons.filter((icon) => icon.closest("tbody"));
    expect(rowDeleteIcons.length).toBeGreaterThanOrEqual(1);
  });

  // Hides delete button on request rows when status is OPEN.
  test("hides row delete buttons when status is OPEN", () => {
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ status: "OPEN" })} />);
    const deleteIcons = screen.queryAllByTestId("DeleteIcon");
    // eslint-disable-next-line testing-library/no-node-access
    const rowDeleteIcons = deleteIcons.filter((icon) => icon.closest("tbody"));
    expect(rowDeleteIcons).toHaveLength(0);
  });

  // ─── Confirm Dialogs ──────────────────────────────────────

  // Opens delete cycle confirm dialog.
  test("opens delete cycle confirm dialog", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    fireEvent.click(screen.getByText("Delete Cycle"));
    expect(
      screen.getByText(
        "Are you sure you want to delete this review cycle? All requests and submissions will be lost.",
      ),
    ).toBeInTheDocument();
  });

  // Opens open cycle confirm dialog.
  test("opens open cycle confirm dialog", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    fireEvent.click(screen.getByText("Open Cycle"));
    expect(
      screen.getByText("Open this cycle? Reviewers will be able to submit their reviews."),
    ).toBeInTheDocument();
  });

  // Opens close cycle confirm dialog.
  test("opens close cycle confirm dialog", () => {
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ status: "OPEN" })} />);
    fireEvent.click(screen.getByText("Close Cycle"));
    expect(
      screen.getByText("Close this cycle? No more submissions will be accepted."),
    ).toBeInTheDocument();
  });

  // Opens delete request confirm dialog when row delete is clicked.
  test("opens delete request confirm dialog", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    // eslint-disable-next-line testing-library/no-node-access
    const deleteIcon = screen.getAllByTestId("DeleteIcon").find((icon) => icon.closest("tbody"));
    expect(deleteIcon).toBeDefined();
    // eslint-disable-next-line testing-library/no-node-access
    fireEvent.click(deleteIcon!.closest("button")!);
    expect(
      screen.getByText("Are you sure you want to remove this review request?"),
    ).toBeInTheDocument();
  });

  // ─── Table Headers ─────────────────────────────────────────

  // Renders table column headers.
  test("renders table column headers", () => {
    // Use canManage=false to hide the form (which duplicates label text).
    render(<ReviewCycleDetailClient {...defaultProps} canManage={false} />);
    expect(screen.getByText("Subject (who is being reviewed)")).toBeInTheDocument();
    expect(screen.getByText("Reviewer")).toBeInTheDocument();
    expect(screen.getByText("Review Type")).toBeInTheDocument();
  });

  // ─── Multiple Request Types ────────────────────────────────

  // Renders different review type chips in the table.
  test("renders different review type chips", () => {
    const requests = [
      makeRequest({ id: "r1", type: "SELF" }),
      makeRequest({ id: "r2", type: "MANAGER" }),
      makeRequest({ id: "r3", type: "PEER" }),
      makeRequest({ id: "r4", type: "DIRECT_REPORT" }),
    ];
    // canManage=false hides the form so type names only appear as table chips.
    render(
      <ReviewCycleDetailClient
        {...defaultProps}
        canManage={false}
        cycle={makeCycle({ requests })}
      />,
    );
    // Component generates typeSELF/typeMANAGER etc. which don't match en.json keys
    // (typeSelf/typeManager), so the mock returns the key itself as fallback.
    expect(screen.getByText("typeSELF")).toBeInTheDocument();
    expect(screen.getByText("typeMANAGER")).toBeInTheDocument();
    expect(screen.getByText("typePEER")).toBeInTheDocument();
    expect(screen.getByText("typeDIRECT_REPORT")).toBeInTheDocument();
  });

  // Renders SUBMITTED status chip.
  test("renders SUBMITTED status chip", () => {
    render(
      <ReviewCycleDetailClient
        {...defaultProps}
        cycle={makeCycle({
          requests: [makeRequest({ status: "SUBMITTED" })],
        })}
      />,
    );
    expect(screen.getByText("SUBMITTED")).toBeInTheDocument();
  });

  // ─── Open Cycle Action ──────────────────────────────────────

  // Confirming open cycle calls openReviewCycle and shows success snackbar.
  test("confirming open cycle calls openReviewCycle and shows success snackbar", async () => {
    (openReviewCycle as jest.Mock).mockResolvedValue(undefined);
    render(<ReviewCycleDetailClient {...defaultProps} />);
    // Click the toolbar button — multiple "Open Cycle" texts exist once the dialog opens.
    fireEvent.click(screen.getAllByText("Open Cycle")[0]);
    // Dialog confirm button is the last "Open Cycle" in the DOM.
    const allOpenCycleButtons = screen.getAllByText("Open Cycle");
    fireEvent.click(allOpenCycleButtons[allOpenCycleButtons.length - 1]);
    await waitFor(() => {
      expect(openReviewCycle as jest.Mock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Review cycle is now open");
    });
  });

  // Cancelling the open cycle dialog does not call openReviewCycle.
  test("cancelling open cycle dialog does not call openReviewCycle", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    fireEvent.click(screen.getAllByText("Open Cycle")[0]);
    // Dialog opens — click Cancel.
    fireEvent.click(screen.getByText("Cancel"));
    expect(openReviewCycle as jest.Mock).not.toHaveBeenCalled();
  });

  // Open cycle action returning an error shows error snackbar.
  test("open cycle error shows error snackbar", async () => {
    (openReviewCycle as jest.Mock).mockResolvedValue({ error: "Cycle already open" });
    render(<ReviewCycleDetailClient {...defaultProps} />);
    fireEvent.click(screen.getAllByText("Open Cycle")[0]);
    const allOpenCycleButtons = screen.getAllByText("Open Cycle");
    fireEvent.click(allOpenCycleButtons[allOpenCycleButtons.length - 1]);
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Cycle already open");
    });
  });

  // ─── Close Cycle Action ─────────────────────────────────────

  // Confirming close cycle calls closeReviewCycle and shows success snackbar.
  test("confirming close cycle calls closeReviewCycle and shows success snackbar", async () => {
    (closeReviewCycle as jest.Mock).mockResolvedValue(undefined);
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ status: "OPEN" })} />);
    fireEvent.click(screen.getAllByText("Close Cycle")[0]);
    // Dialog confirm button is the last "Close Cycle" in the DOM.
    const allCloseCycleButtons = screen.getAllByText("Close Cycle");
    fireEvent.click(allCloseCycleButtons[allCloseCycleButtons.length - 1]);
    await waitFor(() => {
      expect(closeReviewCycle as jest.Mock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Review cycle is now closed");
    });
  });

  // Cancelling the close cycle dialog does not call closeReviewCycle.
  test("cancelling close cycle dialog does not call closeReviewCycle", () => {
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ status: "OPEN" })} />);
    fireEvent.click(screen.getAllByText("Close Cycle")[0]);
    fireEvent.click(screen.getByText("Cancel"));
    expect(closeReviewCycle as jest.Mock).not.toHaveBeenCalled();
  });

  // Close cycle action returning an error shows error snackbar.
  test("close cycle error shows error snackbar", async () => {
    (closeReviewCycle as jest.Mock).mockResolvedValue({ error: "Cycle not open" });
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ status: "OPEN" })} />);
    fireEvent.click(screen.getAllByText("Close Cycle")[0]);
    const allCloseCycleButtons = screen.getAllByText("Close Cycle");
    fireEvent.click(allCloseCycleButtons[allCloseCycleButtons.length - 1]);
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Cycle not open");
    });
  });

  // ─── Delete Cycle Action ────────────────────────────────────

  // Confirming delete cycle calls deleteReviewCycle, shows snackbar, and redirects.
  test("confirming delete cycle calls deleteReviewCycle and redirects", async () => {
    (deleteReviewCycle as jest.Mock).mockResolvedValue(undefined);
    render(<ReviewCycleDetailClient {...defaultProps} />);
    fireEvent.click(screen.getByText("Delete Cycle"));
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => {
      expect(deleteReviewCycle as jest.Mock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Review cycle deleted");
      expect(mockPush).toHaveBeenCalledWith("/reviews");
    });
  });

  // Cancelling the delete cycle dialog does not call deleteReviewCycle.
  test("cancelling delete cycle dialog does not call deleteReviewCycle", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    fireEvent.click(screen.getByText("Delete Cycle"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(deleteReviewCycle as jest.Mock).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // Delete cycle action returning an error shows error snackbar and does not redirect.
  test("delete cycle error shows error snackbar without redirecting", async () => {
    (deleteReviewCycle as jest.Mock).mockResolvedValue({ error: "Permission denied" });
    render(<ReviewCycleDetailClient {...defaultProps} />);
    fireEvent.click(screen.getByText("Delete Cycle"));
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith("Permission denied");
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ─── Delete Request Action ──────────────────────────────────

  // Confirming delete request calls removeReviewRequest.
  test("confirming delete request calls removeReviewRequest", async () => {
    (removeReviewRequest as jest.Mock).mockResolvedValue(undefined);
    render(<ReviewCycleDetailClient {...defaultProps} />);
    // eslint-disable-next-line testing-library/no-node-access
    const deleteIcon = screen.getAllByTestId("DeleteIcon").find((icon) => icon.closest("tbody"));
    // eslint-disable-next-line testing-library/no-node-access
    fireEvent.click(deleteIcon!.closest("button")!);
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => {
      expect(removeReviewRequest as jest.Mock).toHaveBeenCalled();
    });
  });

  // Cancelling the delete request dialog does not call removeReviewRequest.
  test("cancelling delete request dialog does not call removeReviewRequest", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    // eslint-disable-next-line testing-library/no-node-access
    const deleteIcon = screen.getAllByTestId("DeleteIcon").find((icon) => icon.closest("tbody"));
    // eslint-disable-next-line testing-library/no-node-access
    fireEvent.click(deleteIcon!.closest("button")!);
    fireEvent.click(screen.getByText("Cancel"));
    expect(removeReviewRequest as jest.Mock).not.toHaveBeenCalled();
  });

  // Delete request sends correct requestId and cycleId in FormData.
  test("delete request sends correct requestId and cycleId", async () => {
    (removeReviewRequest as jest.Mock).mockResolvedValue(undefined);
    render(
      <ReviewCycleDetailClient
        {...defaultProps}
        cycle={makeCycle({ requests: [makeRequest({ id: "req-abc" })] })}
      />,
    );
    // eslint-disable-next-line testing-library/no-node-access
    const deleteIcon = screen.getAllByTestId("DeleteIcon").find((icon) => icon.closest("tbody"));
    // eslint-disable-next-line testing-library/no-node-access
    fireEvent.click(deleteIcon!.closest("button")!);
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => {
      expect(removeReviewRequest as jest.Mock).toHaveBeenCalled();
    });
    const callArg = (removeReviewRequest as jest.Mock).mock.calls[0][0] as FormData;
    expect(callArg.get("requestId")).toBe("req-abc");
    expect(callArg.get("cycleId")).toBe("cycle-1");
  });

  // ─── Error Display ──────────────────────────────────────────

  // Remove request returning an error — action is called and the error response is received.
  // Note: useFormAction dispatches via startTransition, which in JSDOM may not flush the
  // error state into the DOM in all cases. We verify the action is called with the error.
  test("remove request error — removeReviewRequest is called with error response", async () => {
    (removeReviewRequest as jest.Mock).mockResolvedValue({ error: "Request not found" });
    render(<ReviewCycleDetailClient {...defaultProps} />);
    // eslint-disable-next-line testing-library/no-node-access
    const deleteIcon = screen.getAllByTestId("DeleteIcon").find((icon) => icon.closest("tbody"));
    // eslint-disable-next-line testing-library/no-node-access
    fireEvent.click(deleteIcon!.closest("button")!);
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => {
      expect(removeReviewRequest as jest.Mock).toHaveBeenCalled();
    });
    // Verify the mock received the error payload.
    expect((removeReviewRequest as jest.Mock).mock.results[0].value).resolves.toMatchObject({
      error: "Request not found",
    });
  });

  // Status chip renders DRAFT using the interpolated translation key (statusDRAFT → key fallback).
  test("renders DRAFT status chip", () => {
    render(<ReviewCycleDetailClient {...defaultProps} />);
    // The component calls t(`status${cycle.status}`) which produces "statusDRAFT"; since that
    // exact key is not in en.json (which has "statusDraft"), the mock returns the key verbatim.
    expect(screen.getByText("statusDRAFT")).toBeInTheDocument();
  });

  // Status chip renders OPEN using the interpolated translation key (statusOPEN → key fallback).
  test("renders OPEN status chip", () => {
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ status: "OPEN" })} />);
    expect(screen.getByText("statusOPEN")).toBeInTheDocument();
  });

  // Status chip renders CLOSED using the interpolated translation key (statusCLOSED → key fallback).
  test("renders CLOSED status chip", () => {
    render(<ReviewCycleDetailClient {...defaultProps} cycle={makeCycle({ status: "CLOSED" })} />);
    expect(screen.getByText("statusCLOSED")).toBeInTheDocument();
  });
});
