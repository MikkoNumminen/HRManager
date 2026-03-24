import { render, screen } from "@testing-library/react";
import EmployeeProfileClient from "@/components/EmployeeProfileClient";
import { EmployeeProfile } from "@/schemas";

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

const baseProfile: EmployeeProfile = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Alice Johnson",
  position: "Senior Developer",
  email: "alice@example.com",
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-06-01"),
  teams: [],
  managedTeams: [],
  headOfDepartments: [],
};

describe("EmployeeProfileClient", () => {
  // Displays the employee's name as a heading.
  test("renders employee name", () => {
    render(<EmployeeProfileClient profile={baseProfile} />);
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
  });

  // Displays the employee's position.
  test("renders position", () => {
    render(<EmployeeProfileClient profile={baseProfile} />);
    expect(screen.getByText("Senior Developer")).toBeInTheDocument();
  });

  // Displays the employee's email address.
  test("renders email", () => {
    render(<EmployeeProfileClient profile={baseProfile} />);
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  // Shows the "member since" date from createdAt.
  test("renders member since date", () => {
    render(<EmployeeProfileClient profile={baseProfile} />);
    expect(screen.getByText(/Member since/)).toBeInTheDocument();
  });

  // Shows avatar initials derived from the name.
  test("renders avatar with initials", () => {
    render(<EmployeeProfileClient profile={baseProfile} />);
    expect(screen.getByText("AJ")).toBeInTheDocument();
  });

  // Hides position section when position is null.
  test("hides position when null", () => {
    const profile = { ...baseProfile, position: null };
    render(<EmployeeProfileClient profile={profile} />);
    expect(screen.queryByText("Senior Developer")).not.toBeInTheDocument();
  });

  // Hides email section when email is null.
  test("hides email when null", () => {
    const profile = { ...baseProfile, email: null };
    render(<EmployeeProfileClient profile={profile} />);
    expect(screen.queryByText("alice@example.com")).not.toBeInTheDocument();
  });

  // Shows "not a member of any team" when teams array is empty.
  test("shows no teams message when teams is empty", () => {
    render(<EmployeeProfileClient profile={baseProfile} />);
    expect(screen.getByText("Not a member of any team")).toBeInTheDocument();
  });

  // Renders team chips when the employee belongs to teams.
  test("renders team chips", () => {
    const profile: EmployeeProfile = {
      ...baseProfile,
      teams: [
        { teamId: "t1", teamName: "Engineering" },
        { teamId: "t2", teamName: "Design" },
      ],
    };
    render(<EmployeeProfileClient profile={profile} />);
    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.queryByText("Not a member of any team")).not.toBeInTheDocument();
  });

  // Shows the Leadership Roles section when the employee manages teams.
  test("renders managed teams in leadership section", () => {
    const profile: EmployeeProfile = {
      ...baseProfile,
      managedTeams: [{ teamId: "t1", teamName: "Platform" }],
    };
    render(<EmployeeProfileClient profile={profile} />);
    expect(screen.getByText("Leadership Roles")).toBeInTheDocument();
    expect(screen.getByText("Team Manager")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  // Shows the Leadership Roles section when the employee heads departments.
  test("renders head of departments in leadership section", () => {
    const profile: EmployeeProfile = {
      ...baseProfile,
      headOfDepartments: [{ id: "d1", name: "R&D" }],
    };
    render(<EmployeeProfileClient profile={profile} />);
    expect(screen.getByText("Leadership Roles")).toBeInTheDocument();
    expect(screen.getByText("Department Head")).toBeInTheDocument();
    expect(screen.getByText("R&D")).toBeInTheDocument();
  });

  // Hides the Leadership Roles section when there are no leadership roles.
  test("hides leadership section when no leadership roles", () => {
    render(<EmployeeProfileClient profile={baseProfile} />);
    expect(screen.queryByText("Leadership Roles")).not.toBeInTheDocument();
  });

  // Shows both managed teams and department head roles together.
  test("renders both managed teams and department head roles", () => {
    const profile: EmployeeProfile = {
      ...baseProfile,
      managedTeams: [{ teamId: "t1", teamName: "Backend" }],
      headOfDepartments: [{ id: "d1", name: "Engineering" }],
    };
    render(<EmployeeProfileClient profile={profile} />);
    expect(screen.getByText("Team Manager")).toBeInTheDocument();
    expect(screen.getByText("Backend")).toBeInTheDocument();
    expect(screen.getByText("Department Head")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });
});
