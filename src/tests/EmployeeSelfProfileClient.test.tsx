import { render, screen } from "@testing-library/react";
import EmployeeSelfProfileClient from "@/features/employee/components/EmployeeSelfProfileClient";
import { EmployeeProfile } from "@/schemas";

const baseProfile: EmployeeProfile = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Bob Smith",
  position: "Product Manager",
  email: "bob@example.com",
  createdAt: new Date("2023-03-20"),
  updatedAt: new Date("2024-01-01"),
  teams: [],
  managedTeams: [],
  headOfDepartments: [],
};

describe("EmployeeSelfProfileClient", () => {
  // Renders the employee's full name as a heading.
  test("renders employee name", () => {
    render(<EmployeeSelfProfileClient profile={baseProfile} />);
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
  });

  // Renders the position when provided.
  test("renders position", () => {
    render(<EmployeeSelfProfileClient profile={baseProfile} />);
    expect(screen.getByText("Product Manager")).toBeInTheDocument();
  });

  // Renders the email address when provided.
  test("renders email", () => {
    render(<EmployeeSelfProfileClient profile={baseProfile} />);
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  // Shows avatar initials derived from the name.
  test("renders avatar initials", () => {
    render(<EmployeeSelfProfileClient profile={baseProfile} />);
    expect(screen.getByText("BS")).toBeInTheDocument();
  });

  // Hides position section when position is null.
  test("hides position when null", () => {
    render(<EmployeeSelfProfileClient profile={{ ...baseProfile, position: null }} />);
    expect(screen.queryByText("Product Manager")).not.toBeInTheDocument();
  });

  // Hides email section when email is null.
  test("hides email when null", () => {
    render(<EmployeeSelfProfileClient profile={{ ...baseProfile, email: null }} />);
    expect(screen.queryByText("bob@example.com")).not.toBeInTheDocument();
  });

  // Shows a hire-date-related label from the profile's createdAt.
  test("renders hire date label", () => {
    render(<EmployeeSelfProfileClient profile={baseProfile} />);
    expect(screen.getByText(/member since/i)).toBeInTheDocument();
  });

  // Shows "not a member of any team" when teams array is empty.
  test("shows no-teams message when teams empty", () => {
    render(<EmployeeSelfProfileClient profile={baseProfile} />);
    expect(screen.getByText(/not a member/i)).toBeInTheDocument();
  });

  // Renders team chips when the employee belongs to teams.
  test("renders team chips", () => {
    const profile: EmployeeProfile = {
      ...baseProfile,
      teams: [
        { teamId: "t1", teamName: "Backend" },
        { teamId: "t2", teamName: "Frontend" },
      ],
    };
    render(<EmployeeSelfProfileClient profile={profile} />);
    expect(screen.getByText("Backend")).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  // Shows the Leadership Roles section when the employee manages teams.
  test("renders leadership section when managing teams", () => {
    const profile: EmployeeProfile = {
      ...baseProfile,
      managedTeams: [{ teamId: "t1", teamName: "Platform" }],
    };
    render(<EmployeeSelfProfileClient profile={profile} />);
    expect(screen.getByText(/leadership roles/i)).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  // Hides Leadership Roles section when there are no leadership roles.
  test("hides leadership section when no roles", () => {
    render(<EmployeeSelfProfileClient profile={baseProfile} />);
    expect(screen.queryByText(/leadership roles/i)).not.toBeInTheDocument();
  });

  // Shows GDPR notice to the employee.
  test("renders GDPR notice", () => {
    render(<EmployeeSelfProfileClient profile={baseProfile} />);
    expect(screen.getByText(/personal data/i)).toBeInTheDocument();
  });

  // Shows read-only notice at the bottom.
  test("renders read-only notice", () => {
    render(<EmployeeSelfProfileClient profile={baseProfile} />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });
});
