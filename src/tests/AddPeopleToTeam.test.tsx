import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddPeopleToTeam from "../components/AddPeopleToTeam";
import { addMember, getPersons } from "../serverActions";
import { useRouter } from "next/navigation";
import "@testing-library/jest-dom";

jest.mock("../serverActions", () => ({
  addMember: jest.fn(),
  getPersons: jest.fn(),
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
    (getPersons as jest.Mock).mockResolvedValue(mockPersons);
  });

  test("renders the person list after loading", async () => {
    render(<AddPeopleToTeam teamID={teamID} />);
    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
    });
  });

  test("submit button is disabled when no person is selected", async () => {
    render(<AddPeopleToTeam teamID={teamID} />);
    await waitFor(() => screen.getByText(/Alice/));
    expect(screen.getByRole("button", { name: /Add Member/i })).toBeDisabled();
  });

  test("submit button is enabled after selecting a person", async () => {
    render(<AddPeopleToTeam teamID={teamID} />);
    await waitFor(() => screen.getByText(/Alice/));

    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[0]);

    expect(screen.getByRole("button", { name: /Add Member/i })).not.toBeDisabled();
  });

  test("excludes persons with ids in excludeIds", async () => {
    render(<AddPeopleToTeam teamID={teamID} excludeIds={["person-1"]} />);
    await waitFor(() => screen.getByText(/Bob/));

    expect(screen.queryByText(/Alice/)).not.toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  test("submits the form and calls addMember", async () => {
    (addMember as jest.Mock).mockResolvedValue(undefined);
    render(<AddPeopleToTeam teamID={teamID} />);
    await waitFor(() => screen.getByText(/Alice/));

    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    await waitFor(() => {
      expect(addMember).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  test("shows error message when addMember fails", async () => {
    (addMember as jest.Mock).mockRejectedValue(new Error("Person is already a member"));
    render(<AddPeopleToTeam teamID={teamID} />);
    await waitFor(() => screen.getByText(/Alice/));

    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }));

    await waitFor(() => {
      expect(screen.getByText("Person is already a member")).toBeInTheDocument();
    });
  });
});
