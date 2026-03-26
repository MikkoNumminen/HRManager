import { render, screen, fireEvent } from "@testing-library/react";
import ReportsDashboard from "@/features/reports/components/ReportsDashboard";
import type {
  HeadcountTrend,
  TurnoverRate,
  LeaveUtilization,
  ReviewCompletion,
} from "@/features/reports/schemas";

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

describe("ReportsDashboard – CSV export", () => {
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;
  let mockLink: { href: string; download: string; click: jest.Mock };
  // Save the original createElement before any mocking to avoid recursive calls
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    // Mock URL methods for Blob/object URL
    createObjectURL = jest.fn().mockReturnValue("blob:mock-url");
    revokeObjectURL = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    // Intercept anchor creation to capture the download filename
    mockLink = { href: "", download: "", click: jest.fn() };
    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") return mockLink as unknown as HTMLAnchorElement;
      // Use saved original to avoid infinite recursion
      return originalCreateElement(tag);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Clicking Export CSV on headcount tab triggers download with correct filename
  test("exports headcount CSV with correct filename", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Export CSV"));
    expect(mockLink.download).toBe("headcount-trends.csv");
    expect(mockLink.click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  // Clicking Export CSV on turnover tab triggers download with correct filename
  test("exports turnover CSV with correct filename", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Turnover"));
    fireEvent.click(screen.getByText("Export CSV"));
    expect(mockLink.download).toBe("turnover-rates.csv");
    expect(mockLink.click).toHaveBeenCalledTimes(1);
  });

  // Clicking Export CSV on leave tab triggers download with correct filename
  test("exports leave CSV with correct filename", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Leave Utilization"));
    fireEvent.click(screen.getByText("Export CSV"));
    expect(mockLink.download).toBe("leave-utilization.csv");
    expect(mockLink.click).toHaveBeenCalledTimes(1);
  });

  // Clicking Export CSV on reviews tab triggers download with correct filename
  test("exports reviews CSV with correct filename", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Review Completion"));
    fireEvent.click(screen.getByText("Export CSV"));
    expect(mockLink.download).toBe("review-completion.csv");
    expect(mockLink.click).toHaveBeenCalledTimes(1);
  });

  // CSV download creates a Blob object URL and cleans it up after click
  test("creates a downloadable object URL when exporting", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Export CSV"));
    // createObjectURL is called with a Blob
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    // The anchor href is set to the object URL
    expect(mockLink.href).toBe("blob:mock-url");
  });
});

describe("ReportsDashboard – department filter", () => {
  // Selecting a department via autocomplete filters headcount table rows
  test("selecting a department filters headcount data", () => {
    render(<ReportsDashboard {...defaultProps} />);
    // Initially both Engineering and Marketing rows are present
    expect(screen.getAllByText("Engineering").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);

    // Open the autocomplete input and select Engineering
    const autocomplete = screen.getByRole("combobox");
    fireEvent.change(autocomplete, { target: { value: "Engineering" } });
    fireEvent.keyDown(autocomplete, { key: "ArrowDown" });
    fireEvent.keyDown(autocomplete, { key: "Enter" });

    // After filtering, only Engineering rows should appear in the table
    expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
  });

  // Selecting a department filters turnover table to only that department's rows
  test("selecting a department filters turnover data", () => {
    // Add a Marketing turnover entry to verify filtering works across tabs
    const extendedTurnover: TurnoverRate[] = [
      ...turnoverRates,
      {
        month: "2026-01",
        departmentName: "Marketing",
        startCount: 5,
        departedCount: 1,
        turnoverPct: 20.0,
      },
    ];
    render(<ReportsDashboard {...defaultProps} turnoverRates={extendedTurnover} />);
    fireEvent.click(screen.getByText("Turnover"));

    // Both departments visible initially
    expect(screen.getAllByText("Engineering").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);

    // Filter to Engineering only via combobox
    const autocomplete = screen.getByRole("combobox");
    fireEvent.change(autocomplete, { target: { value: "Engineering" } });
    fireEvent.keyDown(autocomplete, { key: "ArrowDown" });
    fireEvent.keyDown(autocomplete, { key: "Enter" });

    expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
  });

  // Selecting a department filters leave table to only that department's rows
  test("selecting a department filters leave data", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Leave Utilization"));

    // Both departments visible initially
    expect(screen.getAllByText("Engineering").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);

    // Filter to Engineering only via combobox
    const autocomplete = screen.getByRole("combobox");
    fireEvent.change(autocomplete, { target: { value: "Engineering" } });
    fireEvent.keyDown(autocomplete, { key: "ArrowDown" });
    fireEvent.keyDown(autocomplete, { key: "Enter" });

    expect(screen.queryByText("Marketing")).not.toBeInTheDocument();
  });
});

describe("ReportsDashboard – year filter", () => {
  // Year filter input is present on leave tab and responds to change events
  test("year filter updates value on change", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Leave Utilization"));

    const yearInput = screen.getByLabelText("Year") as HTMLInputElement;
    expect(yearInput).toBeInTheDocument();
    expect(yearInput.value).toBe(String(new Date().getFullYear()));

    fireEvent.change(yearInput, { target: { value: "2025" } });
    expect(yearInput.value).toBe("2025");
  });

  // Year filter is not shown on headcount tab
  test("year filter is absent on headcount tab", () => {
    render(<ReportsDashboard {...defaultProps} />);
    expect(screen.queryByLabelText("Year")).not.toBeInTheDocument();
  });

  // Year filter is not shown on turnover tab
  test("year filter is absent on turnover tab", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Turnover"));
    expect(screen.queryByLabelText("Year")).not.toBeInTheDocument();
  });

  // Year filter is not shown on reviews tab
  test("year filter is absent on reviews tab", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Review Completion"));
    expect(screen.queryByLabelText("Year")).not.toBeInTheDocument();
  });
});

describe("ReportsDashboard – table values", () => {
  // Headcount table renders Hired, Running Headcount column headers and data values
  test("headcount table renders column headers and data values", () => {
    render(<ReportsDashboard {...defaultProps} />);
    // Column headers use English translations
    expect(screen.getByText("Hired")).toBeInTheDocument();
    expect(screen.getByText("Running Headcount")).toBeInTheDocument();
    // Data values: hired=5, departed=1, runningHeadcount=4 for first Engineering row
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
  });

  // Turnover table renders Start Count and Turnover % column headers and numeric data
  test("turnover table renders column headers and data values", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Turnover"));
    // Column headers
    expect(screen.getByText("Start Count")).toBeInTheDocument();
    expect(screen.getByText("Turnover %")).toBeInTheDocument();
    // Data values: startCount=10, turnoverPct=10.0 renders as "10%"
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
    expect(screen.getByText("10%")).toBeInTheDocument();
    // Second row: startCount=14, turnoverPct=0.0 renders as "0%"
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  // Leave table renders Allocated, Used, Remaining, Utilization % headers and data
  test("leave table renders column headers and data values", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Leave Utilization"));
    // Column headers
    expect(screen.getByText("Allocated")).toBeInTheDocument();
    expect(screen.getByText("Used")).toBeInTheDocument();
    expect(screen.getByText("Remaining")).toBeInTheDocument();
    expect(screen.getByText("Utilization %")).toBeInTheDocument();
    // Data values: totalAllocated=100, totalUsed=60, totalRemaining=40
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    // 40 appears in both rows (totalRemaining=40 for both)
    expect(screen.getAllByText("40").length).toBeGreaterThan(0);
    // utilizationPct=60.0 → "60%", utilizationPct=20.0 → "20%"
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
  });

  // Reviews table renders Status, Total Requests, Submitted, Completion % headers
  test("reviews table renders column headers and all data values", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Review Completion"));
    // Column headers use English translations
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Total Requests")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Completion %")).toBeInTheDocument();
    // Data: cycle statuses, request counts, submitted counts
    expect(screen.getByText("CLOSED")).toBeInTheDocument();
    expect(screen.getByText("OPEN")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    // completionPct=90.0 → "90%" (JS drops trailing zero), 33.3 → "33.3%"
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("33.3%")).toBeInTheDocument();
  });

  // Headcount table shows month values for all rows
  test("headcount table shows months for multiple rows", () => {
    render(<ReportsDashboard {...defaultProps} />);
    expect(screen.getAllByText("2026-01").length).toBeGreaterThan(0);
    expect(screen.getByText("2026-02")).toBeInTheDocument();
  });

  // Turnover table shows both Engineering rows (two months)
  test("turnover table shows multiple months", () => {
    render(<ReportsDashboard {...defaultProps} />);
    fireEvent.click(screen.getByText("Turnover"));
    expect(screen.getByText("2026-01")).toBeInTheDocument();
    expect(screen.getByText("2026-02")).toBeInTheDocument();
  });
});
