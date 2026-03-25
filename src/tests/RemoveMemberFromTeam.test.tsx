import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RemoveMemberForm from "@/features/teams/components/RemoveMemberForm";
import { removeMember } from "@/features/teams/actions";
import { useRouter } from "next/navigation";

jest.mock("@/features/teams/actions", () => ({
  removeMember: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockPersons = [
  {
    id: "person-1",
    name: "Alice",
    position: "Dev",
    email: "alice@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "person-2",
    name: "Bob",
    position: "Designer",
    email: "bob@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("RemoveMemberFromTeam Component", () => {
  const mockPush = jest.fn();
  const teamID = "team-1";

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the full person list when no includeOnlyIds given", () => {
    render(<RemoveMemberForm teamID={teamID} persons={mockPersons} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  test("shows only members in includeOnlyIds", () => {
    render(
      <RemoveMemberForm teamID={teamID} persons={mockPersons} includeOnlyIds={["person-1"]} />,
    );

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.queryByText(/Bob/)).not.toBeInTheDocument();
  });

  test("submit button is disabled when no person is selected", () => {
    render(<RemoveMemberForm teamID={teamID} persons={mockPersons} />);
    expect(screen.getByRole("button", { name: /Remove Member/i })).toBeDisabled();
  });

  test("submit button is enabled after selecting a person", () => {
    render(<RemoveMemberForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    expect(screen.getByRole("button", { name: /Remove Member/i })).toBeEnabled();
  });

  test("opens confirmation dialog when remove member is clicked", () => {
    render(<RemoveMemberForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Remove Member/i }));

    expect(screen.getByText(/Are you sure you want to remove Alice/)).toBeInTheDocument();
  });

  test("closes dialog when cancel is clicked", async () => {
    render(<RemoveMemberForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Remove Member/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Are you sure you want to remove Alice/)).not.toBeInTheDocument();
    });
  });

  test("submits the form after confirming dialog", async () => {
    (removeMember as jest.Mock).mockResolvedValue(undefined);
    render(<RemoveMemberForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Remove Member/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(removeMember).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows generic error message when removeMember throws a non-Error value.
  test("shows generic error when removeMember throws non-Error", async () => {
    (removeMember as jest.Mock).mockResolvedValue({ error: "An unexpected error occurred" });
    render(<RemoveMemberForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Remove Member/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  test("shows error message when removeMember fails", async () => {
    (removeMember as jest.Mock).mockResolvedValue({ error: "Person is not a member" });
    render(<RemoveMemberForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Remove Member/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("Person is not a member")).toBeInTheDocument();
    });
  });
});
