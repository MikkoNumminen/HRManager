import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdateManagerForm from "../components/UpdateManager";
import { addManager } from "../serverActions";

jest.mock("../serverActions", () => ({
  addManager: jest.fn(),
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

describe("UpdateManager Component", () => {
  const teamID = "team-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the person list", () => {
    render(<UpdateManagerForm teamID={teamID} persons={mockPersons} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  test("submit button is disabled when no person is selected", () => {
    render(<UpdateManagerForm teamID={teamID} persons={mockPersons} />);
    expect(screen.getByRole("button", { name: /Add Manager/i })).toBeDisabled();
  });

  test("submit button is enabled after selecting a person", () => {
    render(<UpdateManagerForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getAllByRole("radio")[0]);
    expect(screen.getByRole("button", { name: /Add Manager/i })).not.toBeDisabled();
  });

  test("excludes persons with ids in excludeIds", () => {
    render(<UpdateManagerForm teamID={teamID} persons={mockPersons} excludeIds={["person-1"]} />);

    expect(screen.queryByText(/Alice/)).not.toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  test("submits the form and calls addManager", async () => {
    (addManager as jest.Mock).mockResolvedValue(undefined);
    render(<UpdateManagerForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Add Manager/i }));

    await waitFor(() => {
      expect(addManager).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  test("shows error message when addManager fails", async () => {
    (addManager as jest.Mock).mockRejectedValue(new Error("Manager assignment failed"));
    render(<UpdateManagerForm teamID={teamID} persons={mockPersons} />);

    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Add Manager/i }));

    await waitFor(() => {
      expect(screen.getByText("Manager assignment failed")).toBeInTheDocument();
    });
  });
});
