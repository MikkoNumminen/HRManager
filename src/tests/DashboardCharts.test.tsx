import { render, screen } from "@testing-library/react";
import DashboardCharts from "../components/DashboardCharts";
import type {
  DashboardTeamSize,
  DashboardDepartmentSize,
  DashboardGrowthPoint,
  DashboardRecentActivity,
} from "../schemas";

// Mock @mui/x-charts — they use canvas/SVG internals that JSDOM can't render
jest.mock("@mui/x-charts/BarChart", () => ({
  BarChart: (props: Record<string, unknown>) => (
    <div data-testid="bar-chart" data-series={JSON.stringify(props.series)} />
  ),
}));
jest.mock("@mui/x-charts/PieChart", () => ({
  PieChart: (props: Record<string, unknown>) => (
    <div data-testid="pie-chart" data-series={JSON.stringify(props.series)} />
  ),
}));
jest.mock("@mui/x-charts/LineChart", () => ({
  LineChart: (props: Record<string, unknown>) => (
    <div data-testid="line-chart" data-series={JSON.stringify(props.series)} />
  ),
}));

const teamSizes: DashboardTeamSize[] = [
  { teamName: "Alpha", memberCount: 5 },
  { teamName: "Beta", memberCount: 3 },
];

const departmentSizes: DashboardDepartmentSize[] = [
  { departmentName: "Engineering", teamCount: 3 },
  { departmentName: "Marketing", teamCount: 2 },
];

const growthTimeline: DashboardGrowthPoint[] = [
  { date: "2026-01-01", persons: 5, teams: 2, departments: 1 },
  { date: "2026-02-01", persons: 10, teams: 4, departments: 2 },
];

const recentActivity: DashboardRecentActivity[] = [
  {
    action: "create",
    entityType: "person",
    userEmail: "admin@example.com",
    createdAt: new Date("2026-03-20"),
  },
  {
    action: "update",
    entityType: "team",
    userEmail: "admin@example.com",
    createdAt: new Date("2026-03-19"),
  },
  {
    action: "delete",
    entityType: "department",
    userEmail: null,
    createdAt: new Date("2026-03-18"),
  },
];

describe("DashboardCharts", () => {
  const defaultProps = {
    teamSizes,
    departmentSizes,
    growthTimeline,
    recentActivity,
  };

  // Renders all four chart sections.
  test("renders all chart section headings", () => {
    render(<DashboardCharts {...defaultProps} />);
    expect(screen.getByText("Members per Team")).toBeInTheDocument();
    expect(screen.getByText("Teams per Department")).toBeInTheDocument();
    expect(screen.getByText("Organization Growth")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });

  // Renders the bar chart when team data is present.
  test("renders bar chart with team data", () => {
    render(<DashboardCharts {...defaultProps} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  // Renders the pie chart when department data is present.
  test("renders pie chart with department data", () => {
    render(<DashboardCharts {...defaultProps} />);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  // Renders the line chart when growth timeline data is present.
  test("renders line chart with growth data", () => {
    render(<DashboardCharts {...defaultProps} />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  // Shows "No data available" when teamSizes is empty.
  test("shows no data message when teamSizes is empty", () => {
    render(<DashboardCharts {...defaultProps} teamSizes={[]} />);
    const noDataMessages = screen.getAllByText("No data available");
    expect(noDataMessages.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
  });

  // Shows "No data available" when departmentSizes is empty.
  test("shows no data message when departmentSizes is empty", () => {
    render(<DashboardCharts {...defaultProps} departmentSizes={[]} />);
    const noDataMessages = screen.getAllByText("No data available");
    expect(noDataMessages.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();
  });

  // Hides the growth chart when growthTimeline is empty.
  test("hides growth chart when growthTimeline is empty", () => {
    render(<DashboardCharts {...defaultProps} growthTimeline={[]} />);
    expect(screen.queryByText("Organization Growth")).not.toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  // Renders recent activity entries with action chips.
  test("renders recent activity entries with action chips", () => {
    render(<DashboardCharts {...defaultProps} />);
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("Update")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  // Renders entity type labels in recent activity.
  test("renders entity type labels in recent activity", () => {
    render(<DashboardCharts {...defaultProps} />);
    expect(screen.getByText("Person")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Department")).toBeInTheDocument();
  });

  // Shows user email in recent activity entries.
  test("shows user email in recent activity", () => {
    render(<DashboardCharts {...defaultProps} />);
    const emails = screen.getAllByText("admin@example.com");
    expect(emails.length).toBe(2);
  });

  // Shows "System" when userEmail is null in activity entry.
  test("shows System when userEmail is null", () => {
    render(<DashboardCharts {...defaultProps} />);
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  // Shows "No recent activity" when recentActivity is empty.
  test("shows no activity message when recentActivity is empty", () => {
    render(<DashboardCharts {...defaultProps} recentActivity={[]} />);
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  // Renders all action types correctly (seed, kickout, reset).
  test("renders seed, kickout, and reset action labels", () => {
    const extraActivity: DashboardRecentActivity[] = [
      {
        action: "seed",
        entityType: "person",
        userEmail: "admin@example.com",
        createdAt: new Date(),
      },
      {
        action: "kickout",
        entityType: "user",
        userEmail: "admin@example.com",
        createdAt: new Date(),
      },
      {
        action: "reset",
        entityType: "person",
        userEmail: "admin@example.com",
        createdAt: new Date(),
      },
    ];
    render(<DashboardCharts {...defaultProps} recentActivity={extraActivity} />);
    expect(screen.getByText("Seed")).toBeInTheDocument();
    expect(screen.getByText("Kick Out")).toBeInTheDocument();
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  // Renders userPermission entity type as "Permission".
  test("renders userPermission entity type as Permission", () => {
    const permActivity: DashboardRecentActivity[] = [
      {
        action: "update",
        entityType: "userPermission",
        userEmail: "admin@example.com",
        createdAt: new Date(),
      },
    ];
    render(<DashboardCharts {...defaultProps} recentActivity={permActivity} />);
    expect(screen.getByText("Permission")).toBeInTheDocument();
  });

  // Renders user entity type as "User".
  test("renders user entity type as User", () => {
    const userActivity: DashboardRecentActivity[] = [
      {
        action: "create",
        entityType: "user",
        userEmail: "admin@example.com",
        createdAt: new Date(),
      },
    ];
    render(<DashboardCharts {...defaultProps} recentActivity={userActivity} />);
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  // Renders teamMember entity type as "Team Member".
  test("renders teamMember entity type as Team Member", () => {
    const tmActivity: DashboardRecentActivity[] = [
      {
        action: "create",
        entityType: "teamMember",
        userEmail: "admin@example.com",
        createdAt: new Date(),
      },
    ];
    render(<DashboardCharts {...defaultProps} recentActivity={tmActivity} />);
    expect(screen.getByText("Team Member")).toBeInTheDocument();
  });
});
