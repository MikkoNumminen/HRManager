import { render, screen } from "@testing-library/react";
import DashboardKPICards from "../components/DashboardKPICards";

describe("DashboardKPICards", () => {
  const defaultProps = {
    totalPersons: 42,
    totalTeams: 8,
    totalDepartments: 5,
    totalUsers: 12,
  };

  // Renders all four KPI values.
  test("renders all four KPI values", () => {
    render(<DashboardKPICards {...defaultProps} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  // Renders all four KPI labels.
  test("renders all four KPI labels", () => {
    render(<DashboardKPICards {...defaultProps} />);
    expect(screen.getByText("Persons")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Departments")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  // Renders zero values correctly.
  test("renders zero values correctly", () => {
    render(
      <DashboardKPICards totalPersons={0} totalTeams={0} totalDepartments={0} totalUsers={0} />,
    );
    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(4);
  });

  // Renders large numbers without formatting issues.
  test("renders large numbers", () => {
    render(
      <DashboardKPICards
        totalPersons={9999}
        totalTeams={500}
        totalDepartments={100}
        totalUsers={2500}
      />,
    );
    expect(screen.getByText("9999")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("2500")).toBeInTheDocument();
  });

  // Renders four card containers.
  test("renders four card containers", () => {
    render(<DashboardKPICards {...defaultProps} />);
    // Each KPI card renders its value as a heading
    const headings = screen.getAllByRole("heading", { level: 4 });
    expect(headings).toHaveLength(4);
  });
});
