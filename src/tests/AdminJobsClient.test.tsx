import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

// Mock SnackbarProvider
const mockShowSnackbar = jest.fn();
jest.mock("@/components/SnackbarProvider", () => ({
  useSnackbar: () => ({ showSnackbar: mockShowSnackbar }),
}));

// Mock server actions
const mockEnqueueCleanup = jest.fn().mockResolvedValue(undefined);
const mockEnqueueExport = jest.fn().mockResolvedValue(undefined);
jest.mock("@/features/jobs/actions", () => ({
  enqueueCleanupJob: (...args: unknown[]) => mockEnqueueCleanup(...args),
  enqueueAuditExportJob: (...args: unknown[]) => mockEnqueueExport(...args),
}));

// Mock MUI icons
jest.mock("@mui/icons-material/PlayArrow", () => ({
  __esModule: true,
  default: () => <span data-testid="play-icon" />,
}));
jest.mock("@mui/icons-material/FileDownload", () => ({
  __esModule: true,
  default: () => <span data-testid="download-icon" />,
}));

import AdminJobsClient from "@/components/AdminJobsClient";
import type { JobStatusResponse } from "@/jobs/types";

const mockStatuses: JobStatusResponse[] = [
  {
    queueName: "cleanup",
    counts: { created: 3, active: 1, completed: 10, failed: 2, expired: 0 },
  },
  {
    queueName: "audit-export",
    counts: { created: 0, active: 0, completed: 5, failed: 0, expired: 1 },
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockEnqueueCleanup.mockResolvedValue(undefined);
  mockEnqueueExport.mockResolvedValue(undefined);
});

// Renders queue names in the table
test("renders queue names in the table", () => {
  render(<AdminJobsClient statuses={mockStatuses} />);
  expect(screen.getByText("cleanup")).toBeInTheDocument();
  expect(screen.getByText("audit-export")).toBeInTheDocument();
});

// Renders status counts as chips
test("renders status count chips", () => {
  render(<AdminJobsClient statuses={mockStatuses} />);
  // The cleanup queue should show its counts
  expect(screen.getByText("3")).toBeInTheDocument(); // created
  expect(screen.getByText("10")).toBeInTheDocument(); // completed
});

// Renders action buttons
test("renders Run Cleanup and Export Audit buttons", () => {
  render(<AdminJobsClient statuses={mockStatuses} />);
  expect(screen.getByTestId("run-cleanup-button")).toBeInTheDocument();
  expect(screen.getByTestId("export-audit-button")).toBeInTheDocument();
});

// Run Cleanup button triggers enqueueCleanupJob server action
test("Run Cleanup button triggers server action", async () => {
  render(<AdminJobsClient statuses={mockStatuses} />);
  fireEvent.click(screen.getByTestId("run-cleanup-button"));

  await waitFor(() => {
    expect(mockEnqueueCleanup).toHaveBeenCalledWith("all");
  });
});

// Export Audit button triggers enqueueAuditExportJob server action
test("Export Audit button triggers server action", async () => {
  render(<AdminJobsClient statuses={mockStatuses} />);
  fireEvent.click(screen.getByTestId("export-audit-button"));

  await waitFor(() => {
    expect(mockEnqueueExport).toHaveBeenCalledWith({
      filters: {},
      format: "json",
    });
  });
});

// Shows empty state when no statuses provided
test("shows empty state when no jobs", () => {
  render(<AdminJobsClient statuses={[]} />);
  expect(screen.getByText("jobs.noJobs")).toBeInTheDocument();
});

// Shows snackbar on successful job enqueue
test("shows success snackbar after enqueue", async () => {
  render(<AdminJobsClient statuses={mockStatuses} />);
  fireEvent.click(screen.getByTestId("run-cleanup-button"));

  await waitFor(() => {
    expect(mockShowSnackbar).toHaveBeenCalledWith("jobs.jobEnqueued");
  });
});

// Shows error snackbar when action returns error
test("shows error snackbar when action fails", async () => {
  mockEnqueueCleanup.mockResolvedValue({ error: "Permission denied", code: "permissionDenied" });

  render(<AdminJobsClient statuses={mockStatuses} />);
  fireEvent.click(screen.getByTestId("run-cleanup-button"));

  await waitFor(() => {
    expect(mockShowSnackbar).toHaveBeenCalledWith("Permission denied");
  });
});

// Renders table headers with correct translation keys
test("renders table column headers", () => {
  render(<AdminJobsClient statuses={mockStatuses} />);
  expect(screen.getByText("jobs.queueName")).toBeInTheDocument();
  expect(screen.getByText("jobs.created")).toBeInTheDocument();
  expect(screen.getByText("jobs.active")).toBeInTheDocument();
  expect(screen.getByText("jobs.completed")).toBeInTheDocument();
  expect(screen.getByText("jobs.failed")).toBeInTheDocument();
  expect(screen.getByText("jobs.expired")).toBeInTheDocument();
});
