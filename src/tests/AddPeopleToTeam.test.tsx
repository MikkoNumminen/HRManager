import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddPeopleToTeam from "../components/AddPeopleToTeam";
import { addMember } from "../serverActions";
import { useRouter } from "next/navigation";

jest.mock("../serverActions", () => ({
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
    render(<AddPeopleToTeam teamID={teamID} persons={mockPersons} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  test("submit button is disabled when no person is selected", () => {
    render(<AddPeopleToTeam teamID={teamID} persons={mockPersons} />);
    expect(screen.getByRole("button", { name: /Add Member/i })).toBeDisabled();
  });

  test("submit button is enabled after selecting a person", () => {
    render(<AddPeopleToTeam teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    expect(screen.getByRole("button", { name: /Add Member/i })).not.toBeDisabled();
  });

  test("excludes persons with ids in excludeIds", () => {
    render(<AddPeopleToTeam teamID={teamID} persons={mockPersons} excludeIds={["person-1"]} />);

    expect(screen.queryByText(/Alice/)).not.toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  test("submits the form and calls addMember", async () => {
    (addMember as jest.Mock).mockResolvedValue(undefined);
    render(<AddPeopleToTeam teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    await waitFor(() => {
      expect(addMember).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  test("shows error message when addMember fails", async () => {
    (addMember as jest.Mock).mockRejectedValue(new Error("Person is already a member"));
    render(<AddPeopleToTeam teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    await waitFor(() => {
      expect(screen.getByText("Person is already a member")).toBeInTheDocument();
    });
  });
});
