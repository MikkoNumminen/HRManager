import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddMemberForm from "@/features/teams/components/AddMemberForm";
import { addMember } from "@/features/teams/actions";
import { useRouter } from "next/navigation";

jest.mock("@/features/teams/actions", () => ({
  addMember: jest.fn(),
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

describe("AddPeopleToTeam Component", () => {
  const mockPush = jest.fn();
  const teamID = "team-1";

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the person list", () => {
    render(<AddMemberForm teamID={teamID} persons={mockPersons} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  test("submit button is disabled when no person is selected", () => {
    render(<AddMemberForm teamID={teamID} persons={mockPersons} />);
    expect(screen.getByRole("button", { name: /Add Member/i })).toBeDisabled();
  });

  test("submit button is enabled after selecting a person", () => {
    render(<AddMemberForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    expect(screen.getByRole("button", { name: /Add Member/i })).toBeEnabled();
  });

  test("excludes persons with ids in excludeIds", () => {
    render(<AddMemberForm teamID={teamID} persons={mockPersons} excludeIds={["person-1"]} />);

    expect(screen.queryByText(/Alice/)).not.toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  test("submits the form and calls addMember", async () => {
    (addMember as jest.Mock).mockResolvedValue(undefined);
    render(<AddMemberForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    await waitFor(() => {
      expect(addMember).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows generic error message when addMember throws a non-Error value.
  test("shows generic error when addMember throws non-Error", async () => {
    (addMember as jest.Mock).mockResolvedValue({ error: "An unexpected error occurred" });
    render(<AddMemberForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  test("shows error message when addMember fails", async () => {
    (addMember as jest.Mock).mockResolvedValue({ error: "Person is already a member" });
    render(<AddMemberForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    await waitFor(() => {
      expect(screen.getByText("Person is already a member")).toBeInTheDocument();
    });
  });
});
