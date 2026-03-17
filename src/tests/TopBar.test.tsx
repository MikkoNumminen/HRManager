import { render, screen } from "@testing-library/react";
import TopBar from "../components/TopBar";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("TopBar", () => {
  test("renders the title", () => {
    render(<TopBar title="Manage Persons" />);
    expect(screen.getByText("Manage Persons")).toBeInTheDocument();
  });

  test("does not render back button when backHref is not provided", () => {
    render(<TopBar title="Home" />);
    expect(screen.queryByText("←")).not.toBeInTheDocument();
  });

  test("renders back button when backHref is provided", () => {
    render(<TopBar title="Manage Persons" backHref="/" />);
    expect(screen.getByText("←")).toBeInTheDocument();
  });

  test("back button links to the correct href", () => {
    render(<TopBar title="Manage Persons" backHref="/managePersons" />);
    const link = screen.getByText("←").closest("a");
    expect(link).toHaveAttribute("href", "/managePersons");
  });
});
