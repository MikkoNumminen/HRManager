import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddTeamForm from "../components/AddTeam";
import { createTeam } from "../serverActions";
import "@testing-library/jest-dom";

jest.mock("../serverActions", () => ({
  createTeam: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AddTeam Component", () => {
  test("submit button is disabled when name is empty", () => {
    render(<AddTeamForm />);
    expect(screen.getByRole("button", { name: /Create/i })).toBeDisabled();
  });

  test("submit button is enabled when name is filled", () => {
    render(<AddTeamForm />);
    fireEvent.change(screen.getByLabelText(/Enter Team Name/i), {
      target: { value: "Engineering" },
    });
    expect(screen.getByRole("button", { name: /Create/i })).not.toBeDisabled();
  });

  test("submits the form and calls createTeam", async () => {
    const mockedCreateTeam = createTeam as jest.MockedFunction<typeof createTeam>;
    render(<AddTeamForm />);

    fireEvent.change(screen.getByLabelText(/Enter Team Name/i), {
      target: { value: "Engineering" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(mockedCreateTeam).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  test("clears the form and calls onSuccess after successful submit", async () => {
    (createTeam as jest.MockedFunction<typeof createTeam>).mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    render(<AddTeamForm onSuccess={onSuccess} />);

    const input = screen.getByLabelText(/Enter Team Name/i);
    fireEvent.change(input, { target: { value: "Engineering" } });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
    expect((input as HTMLInputElement).value).toBe("");
  });

  test("shows error message when createTeam fails", async () => {
    (createTeam as jest.MockedFunction<typeof createTeam>).mockRejectedValue(
      new Error("Team already exists")
    );
    render(<AddTeamForm />);

    fireEvent.change(screen.getByLabelText(/Enter Team Name/i), {
      target: { value: "Engineering" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText("Team already exists")).toBeInTheDocument();
    });
  });
});
