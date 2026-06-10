import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RemovePersonForm from "@/features/persons/components/RemovePersonForm";
import { removePerson } from "@/features/persons/actions";
import { useRouter } from "next/navigation";

jest.mock("@/features/persons/actions", () => ({
  removePerson: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("Remove People", () => {
  const mockPush = jest.fn();
  const personID = "123";

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("remove button is enabled", () => {
    render(<RemovePersonForm personID={personID} />);
    expect(screen.getByRole("button", { name: /Remove/i })).toBeEnabled();
  });

  test("opens confirmation dialog when remove is clicked", async () => {
    render(<RemovePersonForm personID={personID} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    expect(screen.getByText(/Are you sure you want to remove this person/)).toBeInTheDocument();
  });

  test("closes dialog when cancel is clicked", async () => {
    render(<RemovePersonForm personID={personID} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(
        screen.queryByText(/Are you sure you want to remove this person/),
      ).not.toBeInTheDocument();
    });
  });

  test("submits the form after confirming dialog", async () => {
    const mockedRemovePerson = removePerson as jest.MockedFunction<typeof removePerson>;
    render(<RemovePersonForm personID={personID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(mockedRemovePerson).toHaveBeenCalledWith(expect.any(FormData));
    });
    expect(mockPush).toHaveBeenCalledWith("/managePersons");
  });

  // Shows generic error message when removePerson throws a non-Error value.
  test("shows generic error when removePerson throws non-Error", async () => {
    (removePerson as jest.MockedFunction<typeof removePerson>).mockResolvedValue({
      error: "An unexpected error occurred",
      code: "unexpectedError",
    });
    render(<RemovePersonForm personID={personID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  test("shows error message when removePerson fails", async () => {
    (removePerson as jest.MockedFunction<typeof removePerson>).mockResolvedValue({
      error: "Removal failed",
      code: "unexpectedError",
    });
    render(<RemovePersonForm personID={personID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("Removal failed")).toBeInTheDocument();
    });
  });
});

/* eslint-disable testing-library/prefer-screen-queries */
describe("RemovePersonForm – impact branches", () => {
  const getDialog = () => {
    // eslint-disable-next-line testing-library/no-node-access
    const dialog = document.querySelector("[role='dialog']");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { within } = require("@testing-library/react");
    return within(dialog as HTMLElement);
  };

  // No impact prop renders no impact list items in dialog.
  test("no impact prop renders no impact items", async () => {
    render(<RemovePersonForm personID="p1" />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.queryByText(/Affected references/)).not.toBeInTheDocument();
  });

  // Impact with managedTeams shows team names in dialog.
  test("impact with managedTeams shows team names", async () => {
    const impact = {
      managedTeams: [
        { teamId: "t1", teamName: "Alpha" },
        { teamId: "t2", teamName: "Beta" },
      ],
      headedDepartments: [],
      teamMemberships: [],
      leaveRequests: 0,
      reviewRequests: 0,
    };
    render(<RemovePersonForm personID="p1" impact={impact} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.getByText(/Alpha, Beta/)).toBeInTheDocument();
  });

  // Impact with headedDepartments shows department names.
  test("impact with headedDepartments shows dept names", async () => {
    const impact = {
      managedTeams: [],
      headedDepartments: [{ id: "d1", name: "Engineering" }],
      teamMemberships: [],
      leaveRequests: 0,
      reviewRequests: 0,
    };
    render(<RemovePersonForm personID="p1" impact={impact} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.getByText("Engineering")).toBeInTheDocument();
  });

  // Impact with teamMemberships shows team names.
  test("impact with teamMemberships shows team names", async () => {
    const impact = {
      managedTeams: [],
      headedDepartments: [],
      teamMemberships: [{ teamId: "t3", teamName: "Gamma" }],
      leaveRequests: 0,
      reviewRequests: 0,
    };
    render(<RemovePersonForm personID="p1" impact={impact} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.getByText("Gamma")).toBeInTheDocument();
  });

  // Impact with leaveRequests > 0 shows affected references.
  test("impact with leaveRequests shows affected references", async () => {
    const impact = {
      managedTeams: [],
      headedDepartments: [],
      teamMemberships: [],
      leaveRequests: 3,
      reviewRequests: 0,
    };
    render(<RemovePersonForm personID="p1" impact={impact} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.getByText(/Affected references/)).toBeInTheDocument();
    // ICU plural not resolved in test — match raw template substring
    expect(dialog.getByText(/leave request/)).toBeInTheDocument();
  });

  // Impact with reviewRequests > 0 shows affected references.
  test("impact with reviewRequests shows affected references", async () => {
    const impact = {
      managedTeams: [],
      headedDepartments: [],
      teamMemberships: [],
      leaveRequests: 0,
      reviewRequests: 2,
    };
    render(<RemovePersonForm personID="p1" impact={impact} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.getByText(/Affected references/)).toBeInTheDocument();
    expect(dialog.getByText(/review request/)).toBeInTheDocument();
  });

  // Impact with all zeros renders no "Affected references" header.
  test("impact with all zeros has no affected references", async () => {
    const impact = {
      managedTeams: [],
      headedDepartments: [],
      teamMemberships: [],
      leaveRequests: 0,
      reviewRequests: 0,
    };
    render(<RemovePersonForm personID="p1" impact={impact} />);
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));
    const dialog = getDialog();
    expect(dialog.queryByText(/Affected references/)).not.toBeInTheDocument();
  });
});
