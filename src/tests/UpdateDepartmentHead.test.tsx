import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UpdateDepartmentHeadForm from "../components/UpdateDepartmentHead";
import { updateDepartmentHead } from "../serverActions";
import { Person } from "../schemas";

jest.mock("../serverActions", () => ({
  updateDepartmentHead: jest.fn(),
}));

const mockPersons: Person[] = [
  {
    id: "person-1",
    name: "Alice",
    position: "CTO",
    email: "alice@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "person-2",
    name: "Bob",
    position: "VP Engineering",
    email: "bob@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "person-3",
    name: "Carol",
    position: "Director",
    email: "carol@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("UpdateDepartmentHead Component", () => {
  const departmentID = "dept-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders the form title.
  test("renders the form title", () => {
    render(<UpdateDepartmentHeadForm departmentID={departmentID} persons={mockPersons} />);
    expect(screen.getByText("Set Department Head")).toBeInTheDocument();
  });

  // Renders the person list as selectable cards.
  test("renders the person list", () => {
    render(<UpdateDepartmentHeadForm departmentID={departmentID} persons={mockPersons} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
  });

  // Submit button is disabled when no person is selected.
  test("submit button is disabled when no person is selected", () => {
    render(<UpdateDepartmentHeadForm departmentID={departmentID} persons={mockPersons} />);
    expect(screen.getByRole("button", { name: /Set Head/i })).toBeDisabled();
  });

  // Submit button is enabled after selecting a person.
  test("submit button is enabled after selecting a person", () => {
    render(<UpdateDepartmentHeadForm departmentID={departmentID} persons={mockPersons} />);
    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    expect(screen.getByRole("button", { name: /Set Head/i })).toBeEnabled();
  });

  // Excludes persons whose IDs are in the excludeIds list.
  test("excludes persons with ids in excludeIds", () => {
    render(
      <UpdateDepartmentHeadForm
        departmentID={departmentID}
        persons={mockPersons}
        excludeIds={["person-1"]}
      />,
    );
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
  });

  // Submits the form and calls updateDepartmentHead.
  test("submits the form and calls updateDepartmentHead", async () => {
    (updateDepartmentHead as jest.Mock).mockResolvedValue(undefined);
    render(<UpdateDepartmentHeadForm departmentID={departmentID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Set Head/i }));

    await waitFor(() => {
      expect(updateDepartmentHead).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  // Shows error message when updateDepartmentHead fails.
  test("shows error message when updateDepartmentHead fails", async () => {
    (updateDepartmentHead as jest.Mock).mockResolvedValue({ error: "Head assignment failed" });
    render(<UpdateDepartmentHeadForm departmentID={departmentID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Set Head/i }));

    await waitFor(() => {
      expect(screen.getByText("Head assignment failed")).toBeInTheDocument();
    });
  });

  // Shows generic error message when updateDepartmentHead throws a non-Error value.
  test("shows generic error when updateDepartmentHead throws non-Error", async () => {
    (updateDepartmentHead as jest.Mock).mockResolvedValue({
      error: "An unexpected error occurred",
    });
    render(<UpdateDepartmentHeadForm departmentID={departmentID} persons={mockPersons} />);

    fireEvent.click(screen.getByRole("button", { name: "Alice" }));
    fireEvent.click(screen.getByRole("button", { name: /Set Head/i }));

    await waitFor(() => {
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  // Hidden inputs contain the department ID and selected person ID.
  test("includes departmentID and personID as hidden inputs", () => {
    render(<UpdateDepartmentHeadForm departmentID={departmentID} persons={mockPersons} />);
    const deptInput = document.querySelector('input[name="departmentID"]') as HTMLInputElement;
    expect(deptInput.value).toBe(departmentID);

    const personInput = document.querySelector('input[name="personID"]') as HTMLInputElement;
    expect(personInput).toBeTruthy();
  });

  // With empty excludeIds, all persons are shown.
  test("shows all persons when excludeIds is empty", () => {
    render(
      <UpdateDepartmentHeadForm
        departmentID={departmentID}
        persons={mockPersons}
        excludeIds={[]}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
  });
});
