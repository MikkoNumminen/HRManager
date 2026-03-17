import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  test("opens confirmation dialog when remove is clicked", () => {
    render(<RemovePersonForm personID={personID} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));
    expect(screen.getByText(/Are you sure you want to remove this person/)).toBeInTheDocument();
  });

  test("closes dialog when cancel is clicked", async () => {
    render(<RemovePersonForm personID={personID} />);
    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText(/Are you sure you want to remove this person/)).not.toBeInTheDocument();
    });
  });

  test("submits the form after confirming dialog", async () => {
    const mockedRemovePerson = removePerson as jest.MockedFunction<typeof removePerson>;
    render(<RemovePersonForm personID={personID} />);

    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(mockedRemovePerson).toHaveBeenCalledWith(expect.any(FormData));
    });
    expect(mockPush).toHaveBeenCalledWith("/managePersons");
  });

  test("shows error message when removePerson fails", async () => {
    (removePerson as jest.MockedFunction<typeof removePerson>).mockRejectedValue(
      new Error("Removal failed")
    );
    render(<RemovePersonForm personID={personID} />);

    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Remove$/i }));

    await waitFor(() => {
      expect(screen.getByText("Removal failed")).toBeInTheDocument();
    });
  });
});
