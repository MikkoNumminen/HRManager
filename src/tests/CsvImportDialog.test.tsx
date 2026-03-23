import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CsvImportDialog from "../components/CsvImportDialog";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockImportPersonsCsv = jest.fn();
jest.mock("../serverActions", () => ({
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
  test("calls onClose when cancel button is clicked", () => {
    const onClose = jest.fn();
    render(<CsvImportDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Rejects non-CSV files with error message
  test("shows error for non-CSV files", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
    const file = new File(["data"], "test.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Please upload a .csv file")).toBeInTheDocument();
    });
  });

  // Rejects files that exceed the size limit
  test("shows error for oversized files", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
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
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
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
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
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
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
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
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
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
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
    const file = csvFile("name,email");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("CSV file is empty or contains only headers")).toBeInTheDocument();
    });
  });

  // Shows file name in preview
  test("shows file name in preview", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
    const file = csvFile("name,email\nAlice,alice@test.com", "employees.csv");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/employees\.csv/)).toBeInTheDocument();
    });
  });

  // Shows at most 5 preview rows
  test("limits preview to first 5 data rows", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
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
    const dropZone = screen.getByText("Drop a CSV file here or click to browse").closest("div")!;
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
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
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
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
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
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
    const file = new File(["data"], "test.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Please upload a .csv file")).toBeInTheDocument();
    });

    // Close
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    // Reopen — onClose handler should have reset state
    rerender(<CsvImportDialog open={true} onClose={jest.fn()} />);
    expect(screen.getByText("Drop a CSV file here or click to browse")).toBeInTheDocument();
  });

  // Shows validation error details in preview
  test("shows validation error details for invalid rows", async () => {
    render(<CsvImportDialog open={true} onClose={jest.fn()} />);
    const input = document.getElementById("csv-file-input") as HTMLInputElement;
    // Row 2 has empty name — will produce a validation error
    const file = csvFile("name,email\n,alice@test.com\nBob,bob@test.com");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      // Should show at least one row error message
      expect(screen.getByText(/Row 2/)).toBeInTheDocument();
    });
  });
});
