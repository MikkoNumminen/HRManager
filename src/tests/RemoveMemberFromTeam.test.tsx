import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RemoveMemberFromTeam from "../components/RemoveMemberFromTeam";
import { removeMember, getPersons } from "../serverActions";
import { useRouter } from "next/navigation";
import "@testing-library/jest-dom";

jest.mock("../serverActions", () => ({
  removeMember: jest.fn(),
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

describe("RemoveMemberFromTeam Component", () => {
  const mockPush = jest.fn();
  const teamID = "team-1";

  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getPersons as jest.Mock).mockResolvedValue(mockPersons);
  });

  test("renders the full person list when no includeOnlyIds given", async () => {
    render(<RemoveMemberFromTeam teamID={teamID} />);
    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
    });
  });

  test("shows only members in includeOnlyIds", async () => {
    render(<RemoveMemberFromTeam teamID={teamID} includeOnlyIds={["person-1"]} />);
    await waitFor(() => screen.getByText(/Alice/));

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.queryByText(/Bob/)).not.toBeInTheDocument();
  });

  test("submit button is disabled when no person is selected", async () => {
    render(<RemoveMemberFromTeam teamID={teamID} />);
    await waitFor(() => screen.getByText(/Alice/));
    expect(screen.getByRole("button", { name: /Remove Member/i })).toBeDisabled();
  });

  test("submit button is enabled after selecting a person", async () => {
    render(<RemoveMemberFromTeam teamID={teamID} />);
    await waitFor(() => screen.getByText(/Alice/));

    fireEvent.click(screen.getAllByRole("radio")[0]);
    expect(screen.getByRole("button", { name: /Remove Member/i })).not.toBeDisabled();
  });

  test("submits the form and calls removeMember", async () => {
    (removeMember as jest.Mock).mockResolvedValue(undefined);
    render(<RemoveMemberFromTeam teamID={teamID} />);
    await waitFor(() => screen.getByText(/Alice/));

    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Remove Member/i }));

    await waitFor(() => {
      expect(removeMember).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  test("shows error message when removeMember fails", async () => {
    (removeMember as jest.Mock).mockRejectedValue(new Error("Person is not a member"));
    render(<RemoveMemberFromTeam teamID={teamID} />);
    await waitFor(() => screen.getByText(/Alice/));

    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Remove Member/i }));

    await waitFor(() => {
      expect(screen.getByText("Person is not a member")).toBeInTheDocument();
    });
  });
});
