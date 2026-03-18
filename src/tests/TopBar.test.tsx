import { render, screen, fireEvent } from "@testing-library/react";
import TopBar from "../components/TopBar";
import { useSession, signIn, signOut } from "next-auth/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

const mockUseSession = useSession as jest.Mock;

describe("TopBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
  });

  test("renders the title", () => {
    render(<TopBar title="Manage Persons" />);
    expect(screen.getByText("Manage Persons")).toBeInTheDocument();
  });

  test("does not render back button when backHref is not provided", () => {
    render(<TopBar title="Home" />);
    expect(screen.queryByLabelText("Go back")).not.toBeInTheDocument();
  });

  test("renders back button when backHref is provided", () => {
    render(<TopBar title="Manage Persons" backHref="/" />);
    expect(screen.getByLabelText("Go back")).toBeInTheDocument();
  });

  test("back button links to the correct href", () => {
    render(<TopBar title="Manage Persons" backHref="/managePersons" />);
    const link = screen.getByLabelText("Go back").closest("a");
    expect(link).toHaveAttribute("href", "/managePersons");
  });

  test("shows Sign in button when unauthenticated", () => {
    render(<TopBar title="Home" />);
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeInTheDocument();
  });

  test("calls signIn when Sign in button is clicked", () => {
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    expect(signIn).toHaveBeenCalled();
  });

  test("shows user avatar when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    expect(screen.getByLabelText("User menu")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sign in/i })).not.toBeInTheDocument();
  });

  test("shows user menu on avatar click with name and email", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  test("calls signOut when sign out is clicked", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    fireEvent.click(screen.getByLabelText("User menu"));
    fireEvent.click(screen.getByText("Sign out"));
    expect(signOut).toHaveBeenCalled();
  });

  test("displays user initials when no image is provided", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Alice Smith", email: "alice@example.com", image: null } },
      status: "authenticated",
    });
    render(<TopBar title="Home" />);
    expect(screen.getByText("AS")).toBeInTheDocument();
  });
});
