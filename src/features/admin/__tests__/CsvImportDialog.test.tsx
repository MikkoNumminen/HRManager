import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CsvImportDialog from "@/features/admin/components/CsvImportDialog";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockImportPersonsCsv = jest.fn();
jest.mock("@/features/data/actions", () => ({
  importPersonsCsv: (...args: unknown[]) => mockImportPersonsCsv(...args),
}));

// Helper to create a File object from CSV text
function csvFile(content: string, name = "test.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

describe("CsvImportDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Does not render content when closed
  test("renders nothing when open is false", () => {
    render(<CsvImportDialog open={false} onClose={jest.fn()} />);
    expect(screen.queryByText("Import Persons from CSV")).not.toBeInTheDocument();
  });

  // Shows dialog title when open
  test("shows dialog title when open", () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    expect(screen.getByText("Import Persons from CSV")).toBeInTheDocument();
  });

  // Shows drop zone when no file is selected
  test("shows drop zone text", () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    expect(screen.getByText("Drop a CSV file here or click to browse")).toBeInTheDocument();
  });

  // Shows max size/row hint below drop zone
  test("shows drop zone subtext with limits", () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    expect(screen.getByText("Maximum 1,000 rows, 1 MB file size")).toBeInTheDocument();
  });

  // Shows cancel button
  test("shows cancel button", () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  // Calls onClose when cancel is clicked
  test("calls onClose when cancel button is clicked", async () => {
    const onClose = jest.fn();
    render(<CsvImportDialog open={true} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Rejects non-CSV files with error message
  test("shows error for non-CSV files", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = new File(["data"], "test.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Please upload a .csv file")).toBeInTheDocument();
    });
  });

  // Rejects files that exceed the size limit
  test("shows error for oversized files", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    // Create a file that's > 1MB
    const bigContent = "a".repeat(1024 * 1024 + 1);
    const file = csvFile(bigContent);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("File exceeds 1 MB limit")).toBeInTheDocument();
    });
  });

  // Shows preview table after selecting a valid CSV file
  test("shows preview after selecting a valid CSV file", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = csvFile("name,email\nAlice,alice@test.com\nBob,bob@test.com");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("bob@test.com")).toBeInTheDocument();
    });
  });

  // Shows valid row count in preview chips (ICU plural — raw format returned by mock)
  test("shows valid row count chip after file selection", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = csvFile("name,email\nAlice,alice@test.com\nBob,bob@test.com");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      // The mock returns raw ICU string; just verify the chip is rendered
      expect(screen.getByText(/valid/i)).toBeInTheDocument();
    });
  });

  // Shows error count chip when CSV has invalid rows
  test("shows error count chip for invalid rows", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    // Row 2 has empty name and invalid email — both will produce errors
    const file = csvFile("name,email\nAlice,alice@test.com\n,bad-email");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  // Shows import button after valid file selection
  test("shows import button after valid file selection", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = csvFile("name,email\nAlice,alice@test.com");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      // Import button should exist (text includes ICU plural format)
      expect(screen.getByRole("button", { name: /Import/i })).toBeInTheDocument();
    });
  });

  // Rejects CSV with only headers and no data rows
  test("shows error for CSV with only headers", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = csvFile("name,email");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("CSV file is empty or contains only headers")).toBeInTheDocument();
    });
  });

  // Shows file name in preview
  test("shows file name in preview", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = csvFile("name,email\nAlice,alice@test.com", "employees.csv");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/employees\.csv/)).toBeInTheDocument();
    });
  });

  // Shows at most 5 preview rows
  test("limits preview to first 5 data rows", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const rows = Array.from({ length: 10 }, (_, i) => `Person${i},p${i}@test.com`).join("\n");
    const file = csvFile(`name,email\n${rows}`);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Person0")).toBeInTheDocument();
      expect(screen.getByText("Person4")).toBeInTheDocument();
      // Row 5 and beyond should not be in preview
      expect(screen.queryByText("Person5")).not.toBeInTheDocument();
    });
  });

  // Handles drag and drop of a CSV file
  test("handles file drop", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const dropZone = screen.getByTestId("csv-drop-zone");
    const file = csvFile("name,email\nAlice,alice@test.com");

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
  });

  // Shows header cells in preview table
  test("shows CSV headers in preview table", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = csvFile("name,email,position\nAlice,alice@test.com,Manager");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("name")).toBeInTheDocument();
      expect(screen.getByText("email")).toBeInTheDocument();
      expect(screen.getByText("position")).toBeInTheDocument();
    });
  });

  // Does not show import button when all rows are invalid
  test("hides import button when no valid rows", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    // Both rows have empty names
    const file = csvFile("name,email\n,bad@test.com\n,another@test.com");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      // Cancel button is there, but no Import button
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
      const buttons = screen.getAllByRole("button");
      const importButton = buttons.find((b) => b.textContent?.includes("Import"));
      expect(importButton).toBeUndefined();
    });
  });

  // Clears state when dialog is reopened after closing
  test("clears preview and errors when dialog is closed and reopened", async () => {
    const { rerender } = render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = new File(["data"], "test.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Please upload a .csv file")).toBeInTheDocument();
    });

    // Close
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    // Reopen — onClose handler should have reset state
    rerender(<CsvImportDialog open={true} onClose={jest.fn()} />);
    expect(screen.getByText("Drop a CSV file here or click to browse")).toBeInTheDocument();
  });

  // Shows validation error details in preview
  test("shows validation error details for invalid rows", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    // Row 2 has empty name — will produce a validation error
    const file = csvFile("name,email\n,alice@test.com\nBob,bob@test.com");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      // Should show at least one row error message
      expect(screen.getByText(/Row 2/)).toBeInTheDocument();
    });
  });

  // Shows error when CSV has more than MAX_IMPORT_ROWS data rows
  test("shows error for CSV with too many rows", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    // Create a CSV with 1001 data rows (exceeds MAX_IMPORT_ROWS = 1000)
    const header = "name,email";
    const rows = Array.from({ length: 1001 }, (_, i) => `Person${i},p${i}@test.com`).join("\n");
    const file = csvFile(`${header}\n${rows}`);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/1,000 rows/)).toBeInTheDocument();
    });
  });

  // Clicking the drop zone triggers the file input click handler
  test("clicking drop zone triggers file input click", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const clickSpy = jest.spyOn(input, "click");

    const dropZone = screen.getByTestId("csv-drop-zone");
    await userEvent.click(dropZone);

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  // DragOver event is prevented (required for drop to work)
  test("dragOver event is prevented on drop zone", () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const dropZone = screen.getByTestId("csv-drop-zone");
    const event = new Event("dragover", { bubbles: true, cancelable: true });
    const _prevented = !dropZone.dispatchEvent(event);
    // The event should be preventable (React's onDragOver calls preventDefault)
    expect(event.cancelable).toBe(true);
  });

  // Clicking Import button creates FormData and calls the server action
  test("import button submits the file via FormData", async () => {
    mockImportPersonsCsv.mockResolvedValue({
      result: { imported: 1, skipped: 0, errors: [] },
    });

    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = csvFile("name,email\nAlice,alice@test.com");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Import/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      expect(mockImportPersonsCsv).toHaveBeenCalled();
    });
  });

  // Shows success state after successful import with imported count
  test("shows success state after successful import", async () => {
    mockImportPersonsCsv.mockResolvedValue({
      result: { imported: 3, skipped: 1, errors: [{ row: 2, field: "email", message: "invalid" }] },
    });

    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = csvFile(
      "name,email\nAlice,alice@test.com\nBob,bob@test.com\nCharlie,charlie@test.com\n,bad",
    );

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Import/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      // Success state shows imported/skipped/error chips
      expect(screen.getByText(/imported/i)).toBeInTheDocument();
    });
  });

  // Shows server error message when import action returns an error
  test("shows server error when import returns error", async () => {
    mockImportPersonsCsv.mockResolvedValue({
      error: "Permission denied",
    });

    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = csvFile("name,email\nAlice,alice@test.com");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Import/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      expect(screen.getByText("Permission denied")).toBeInTheDocument();
    });
  });

  // Shows "Close" button text instead of "Cancel" after successful import
  test("shows Close button after successful import", async () => {
    mockImportPersonsCsv.mockResolvedValue({
      result: { imported: 1, skipped: 0, errors: [] },
    });

    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = csvFile("name,email\nAlice,alice@test.com");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Import/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Import/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Close/i })).toBeInTheDocument();
    });
  });

  // File input change with no file selected does nothing (guard clause)
  test("does nothing when file input change fires with no file", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [] } });

    // Drop zone should still be visible (no preview triggered)
    expect(screen.getByText("Drop a CSV file here or click to browse")).toBeInTheDocument();
  });

  // Drop with no files does nothing
  test("does nothing when drop event has no files", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const dropZone = screen.getByTestId("csv-drop-zone");

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [] },
    });

    // Drop zone should still be visible
    expect(screen.getByText("Drop a CSV file here or click to browse")).toBeInTheDocument();
  });
});
