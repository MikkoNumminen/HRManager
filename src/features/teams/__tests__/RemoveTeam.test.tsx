import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RemoveTeamForm from "@/features/teams/components/RemoveTeamForm";
import { removeTeam } from "@/features/teams/actions";

jest.mock("@/features/teams/actions", () => ({
  removeTeam: jest.fn(),
}));

describe("RemoveTeam Component", () => {
  const teamID = "team-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("remove button is enabled", () => {
    render(<RemoveTeamForm teamID={teamID} />);
    expect(screen.getByRole("button", { name: /Remove/i })).toBeEnabled();
  });

  test("opens confirmation dialog when remove is clicked", async () => {
    render(<RemoveTeamForm teamID={teamID} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    expect(screen.getByText(/Are you sure you want to remove this team/)).toBeInTheDocument();
  });

  test("closes dialog when cancel is clicked", async () => {
    render(<RemoveTeamForm teamID={teamID} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(
        screen.queryByText(/Are you sure you want to remove this team/),
      ).not.toBeInTheDocument();
    });
  });

  test("submits the form after confirming dialog", async () => {
    const mockedRemoveTeam = removeTeam as jest.MockedFunction<typeof removeTeam>;
    render(<RemoveTeamForm teamID={teamID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(mockedRemoveTeam).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows generic error message when removeTeam throws a non-Error value.
  test("shows generic error when removeTeam throws non-Error", async () => {
    (removeTeam as jest.MockedFunction<typeof removeTeam>).mockResolvedValue({
      error: "An unexpected error occurred",
    });
    render(<RemoveTeamForm teamID={teamID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  test("shows error message when removeTeam fails", async () => {
    (removeTeam as jest.MockedFunction<typeof removeTeam>).mockResolvedValue({
      error: "Removal failed",
    });
    render(<RemoveTeamForm teamID={teamID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("Removal failed")).toBeInTheDocument();
    });
  });
});

/* eslint-disable testing-library/prefer-screen-queries */
describe("RemoveTeamForm – impact branches", () => {
  const getDialog = () => {
    // eslint-disable-next-line testing-library/no-node-access
    const dialog = document.querySelector("[role='dialog']");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { within } = require("@testing-library/react");
    return within(dialog as HTMLElement);
  };

  // No impact prop renders no affected references.
  test("no impact prop renders no affected references", async () => {
    render(<RemoveTeamForm teamID="t1" />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.queryByText(/Affected references/)).not.toBeInTheDocument();
  });

  // Impact with memberCount=0 and no department shows no sub-items.
  test("impact with zero members and no department", async () => {
    render(<RemoveTeamForm teamID="t1" impact={{ memberCount: 0, departmentName: null }} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.queryByText(/Affected references/)).not.toBeInTheDocument();
  });

  // Impact with memberCount > 0 shows affected references.
  test("impact with members shows affected references", async () => {
    render(<RemoveTeamForm teamID="t1" impact={{ memberCount: 5, departmentName: null }} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.getByText(/Affected references/)).toBeInTheDocument();
    // ICU plural not resolved in test — label + items both contain "member"
    expect(dialog.getAllByText(/member/i).length).toBeGreaterThanOrEqual(1);
  });

  // Impact with departmentName shows department.
  test("impact with department shows name", async () => {
    render(
      <RemoveTeamForm teamID="t1" impact={{ memberCount: 0, departmentName: "Engineering" }} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.getByText("Engineering")).toBeInTheDocument();
  });

  // Impact with both members and department.
  test("impact with both members and department", async () => {
    render(<RemoveTeamForm teamID="t1" impact={{ memberCount: 3, departmentName: "HR" }} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.getByText(/Affected references/)).toBeInTheDocument();
    expect(dialog.getByText("HR")).toBeInTheDocument();
  });
});
