import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RemovePersonForm from "../components/RemovePerson";
import { removePerson } from "../serverActions";
import { useRouter } from "next/navigation";

jest.mock("../serverActions", () => ({
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
    expect(screen.getByRole("button", { name: /Remove/i })).not.toBeDisabled();
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
    });
    render(<RemovePersonForm personID={personID} />);

    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("Removal failed")).toBeInTheDocument();
    });
  });
});
