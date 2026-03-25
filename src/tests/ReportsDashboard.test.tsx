import { render, screen, fireEvent } from "@testing-library/react";
import ReportsDashboard from "@/features/reports/components/ReportsDashboard";
import type {
  HeadcountTrend,
  TurnoverRate,
  LeaveUtilization,
  ReviewCompletion,
} from "../features/reports/schemas";

// Mock @mui/x-charts — they use canvas/SVG internals that JSDOM can't render
jest.mock("@mui/x-charts/BarChart", () => ({
  BarChart: (props: Record<string, unknown>) => (
    <div data-testid="bar-chart" data-series={JSON.stringify(props.series)} />
  ),
}));
jest.mock("@mui/x-charts/LineChart", () => ({
  LineChart: (props: Record<string, unknown>) => (
    <div data-testid="line-chart" data-series={JSON.stringify(props.series)} />
  ),
}));

// Mock @mui/icons-material/Download to avoid ESM issues in test
jest.mock("@mui/icons-material/Download", () => ({
  __esModule: true,
  default: () => <span data-testid="download-icon" />,
}));

const headcountTrends: HeadcountTrend[] = [
  { month: "2026-01", departmentName: "Engineering", hired: 5, departed: 1, runningHeadcount: 4 },
  { month: "2026-02", departmentName: "Engineering", hired: 3, departed: 0, runningHeadcount: 7 },
  { month: "2026-01", departmentName: "Marketing", hired: 2, departed: 0, runningHeadcount: 2 },
];

const turnoverRates: TurnoverRate[] = [
  {
    month: "2026-01",
    departmentName: "Engineering",
    startCount: 10,
    departedCount: 1,
    turnoverPct: 10.0,
  },
  {
    month: "2026-02",
    departmentName: "Engineering",
    startCount: 14,
    departedCount: 0,
    turnoverPct: 0.0,
  },
];

const leaveUtilization: LeaveUtilization[] = [
  {
    departmentName: "Engineering",
    leaveTypeName: "Annual",
    leaveTypeColor: "#1976d2",
    totalAllocated: 100,
    totalUsed: 60,
    totalRemaining: 40,
    utilizationPct: 60.0,
  },
  {
    departmentName: "Marketing",
    leaveTypeName: "Sick",
    leaveTypeColor: "#e53935",
    totalAllocated: 50,
    totalUsed: 10,
    totalRemaining: 40,
    utilizationPct: 20.0,
  },
];

const reviewCompletion: ReviewCompletion[] = [
  {
    cycleName: "Q1 2026",
    cycleStatus: "CLOSED",
    totalRequests: 20,
    submittedCount: 18,
    completionPct: 90.0,
  },
  {
    cycleName: "Q2 2026",
    cycleStatus: "OPEN",
    totalRequests: 15,
    submittedCount: 5,
    completionPct: 33.3,
  },
];

const departments = [
  { id: "dept-1", name: "Engineering" },
  { id: "dept-2", name: "Marketing" },
];

const defaultProps = {
  headcountTrends,
  turnoverRates,
  leaveUtilization,
  reviewCompletion,
  departments,
  canExport: true,
};

describe("ReportsDashboard", () => {
  // Renders all four tab labels
  test("renders all four tabs", () => {
    render(<ReportsDashboard {...defaultProps} />);
    expect(screen.getByText("Headcount")).toBeInTheDocument();
    expect(screen.getByText("Turnover")).toBeInTheDocument();
    expect(screen.getByText("Leave Utilization")).toBeInTheDocument();
    expect(screen.getByText("Review Completion")).toBeInTheDocument();
  });

  // Shows headcount chart on first tab (default)
  test("shows headcount chart on default tab", () => {
    render(<ReportsDashboard {...defaultProps} />);
    expect(screen.getByText("Headcount Over Time")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  // Shows headcount data table with correct values
  test("shows headcount data table", () => {
    render(<ReportsDashboard {...defaultProps} />);
    expect(screen.getAllByText("Engineering").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2026-01").length).toBeGreaterThan(0);
  });

  // Switching to turnover tab renders bar chart
  test("switching to turnover tab shows turnover chart", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Turnover"));
    expect(screen.getByText("Turnover Rate Over Time")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  // Switching to leave tab renders stacked bar chart
  test("switching to leave tab shows leave chart", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Leave Utilization"));
    expect(screen.getByText("Leave Usage by Department")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  // Switching to reviews tab renders completion chart
  test("switching to reviews tab shows review completion", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Review Completion"));
    expect(screen.getByText("Review Completion by Cycle")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  // Shows export CSV button when user has export permission
  test("shows export button when canExport is true", () => {
    render(<ReportsDashboard {...defaultProps} />);
    expect(screen.getByText("Export CSV")).toBeInTheDocument();
  });

  // Hides export button when user lacks export permission
  test("hides export button when canExport is false", () => {
    render(<ReportsDashboard {...defaultProps} canExport={false} />);
    expect(screen.queryByText("Export CSV")).not.toBeInTheDocument();
  });

  // Shows department filter dropdown on headcount tab
  test("shows department filter on headcount tab", () => {
    render(<ReportsDashboard {...defaultProps} />);
    expect(screen.getByLabelText("Department")).toBeInTheDocument();
  });

  // Shows year filter on leave utilization tab
  test("shows year filter on leave tab", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Leave Utilization"));
    expect(screen.getByLabelText("Year")).toBeInTheDocument();
  });

  // Does not show department filter on reviews tab
  test("hides department filter on reviews tab", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Review Completion"));
    expect(screen.queryByLabelText("Department")).not.toBeInTheDocument();
  });

  // Shows empty state message when headcount data is empty
  test("shows empty state when no headcount data", () => {
    render(<ReportsDashboard {...defaultProps} headcountTrends={[]} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  // Shows empty state when turnover data is empty
  test("shows empty state when no turnover data", () => {
    render(<ReportsDashboard {...defaultProps} turnoverRates={[]} />);
    fireEvent.click(screen.getByText("Turnover"));
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  // Shows empty state when leave data is empty
  test("shows empty state when no leave data", () => {
    render(<ReportsDashboard {...defaultProps} leaveUtilization={[]} />);
    fireEvent.click(screen.getByText("Leave Utilization"));
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  // Shows empty state when review data is empty
  test("shows empty state when no review data", () => {
    render(<ReportsDashboard {...defaultProps} reviewCompletion={[]} />);
    fireEvent.click(screen.getByText("Review Completion"));
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  // Review table shows cycle names and completion percentages
  test("review table shows cycle data", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Review Completion"));
    expect(screen.getByText("Q1 2026")).toBeInTheDocument();
    expect(screen.getByText("Q2 2026")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  // Leave table shows leave type and utilization data
  test("leave table shows utilization data", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Leave Utilization"));
    expect(screen.getByText("Annual")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });
});
