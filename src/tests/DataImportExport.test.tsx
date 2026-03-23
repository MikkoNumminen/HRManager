import { render, screen, fireEvent } from "@testing-library/react";
import DataImportExport from "../components/DataImportExport";
import { Permissions } from "../schemas";
import { DataExportCounts } from "../queries";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockExportPersonsCsv = jest.fn();
const mockExportTeamsCsv = jest.fn();
const mockExportDepartmentsCsv = jest.fn();
const mockExportAuditLogsCsv = jest.fn();
jest.mock("../serverActions", () => ({
  exportPersonsCsv: (...args: unknown[]) => mockExportPersonsCsv(...args),
  exportTeamsCsv: (...args: unknown[]) => mockExportTeamsCsv(...args),
  exportDepartmentsCsv: (...args: unknown[]) => mockExportDepartmentsCsv(...args),
  exportAuditLogsCsv: (...args: unknown[]) => mockExportAuditLogsCsv(...args),
  importPersonsCsv: jest.fn(),
}));

jest.mock("../components/CsvImportDialog", () => {
  return function MockCsvImportDialog({ open }: { open: boolean }) {
    return open ? <div data-testid="csv-import-dialog">Import Dialog</div> : null;
  };
});

jest.mock("../components/SnackbarProvider", () => ({
  useSnackbar: () => ({ showSnackbar: jest.fn() }),
}));

// Build a permissions object with all keys set to false by default
function makePermissions(overrides: Partial<Record<string, boolean>> = {}): Permissions {
  const perms: Record<string, boolean> = {};
  const keys = [
    "person:create",
    "person:delete",
    "person:update_position",
    "person:update_name",
    "person:update_email",
    "person:read",
    "team:create",
    "team:delete",
    "team:update_name",
    "team:update_manager",
    "team:add_member",
    "team:remove_member",
    "team:read",
    "department:create",
    "department:delete",
    "department:update",
    "department:assign_team",
    "department:read",
    "data:reset",
    "data:seed",
    "admin:manage_users",
    "admin:assign_permissions",
    "admin:view_audit_log",
    "dashboard:view",
    "data:import",
    "data:export",
  ];
  for (const k of keys) {
    perms[k] = false;
  }
  return { ...perms, ...overrides } as unknown as Permissions;
}

const defaultCounts: DataExportCounts = {
  persons: 10,
  teams: 5,
  departments: 3,
  auditLogs: 100,
};

describe("DataImportExport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders nothing visible when user has no import or export permissions
  test("renders nothing when user has no data:import or data:export", () => {
    render(<DataImportExport counts={defaultCounts} permissions={makePermissions()} />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  // Shows export section when user has data:export permission
  test("shows export section when user has data:export", () => {
    render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:export": true })}
      />,
    );
    expect(screen.getByText("Export Data")).toBeInTheDocument();
  });

  // Shows 3 export cards (persons, teams, departments) for data:export user
  test("shows 3 export cards without audit log for basic exporter", () => {
    render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:export": true })}
      />,
    );
    expect(screen.getByText("Persons")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Departments")).toBeInTheDocument();
    expect(screen.queryByText("Audit Logs")).not.toBeInTheDocument();
  });

  // Shows audit log export card when user has both data:export and admin:view_audit_log
  test("shows audit log export when user has view_audit_log permission", () => {
    render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:export": true, "admin:view_audit_log": true })}
      />,
    );
    expect(screen.getByText("Audit Logs")).toBeInTheDocument();
  });

  // Renders a record-count line for each export card
  test("renders a record count for each export card", () => {
    render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:export": true, "admin:view_audit_log": true })}
      />,
    );
    // 4 export cards — each has a record-count Typography element
    const cards = screen.getAllByRole("button", { name: /Export/i });
    expect(cards).toHaveLength(4);
  });

  // Disables export buttons when count is 0
  test("disables export button when count is zero", () => {
    render(
      <DataImportExport
        counts={{ ...defaultCounts, persons: 0 }}
        permissions={makePermissions({ "data:export": true })}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: /Export/i });
    // First button is persons — should be disabled
    expect(buttons[0]).toBeDisabled();
  });

  // Shows import section when user has data:import permission
  test("shows import section when user has data:import", () => {
    render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:import": true })}
      />,
    );
    expect(screen.getByText("Import Data")).toBeInTheDocument();
    expect(screen.getByText("Import Persons")).toBeInTheDocument();
  });

  // Hides import section when user only has data:export
  test("hides import section when user only has data:export", () => {
    render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:export": true })}
      />,
    );
    expect(screen.queryByText("Import Data")).not.toBeInTheDocument();
  });

  // Shows both sections when user has both permissions
  test("shows both export and import sections with divider", () => {
    render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:import": true, "data:export": true })}
      />,
    );
    expect(screen.getByText("Export Data")).toBeInTheDocument();
    expect(screen.getByText("Import Data")).toBeInTheDocument();
  });

  // Shows download template button in import section
  test("shows download template button", () => {
    render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:import": true })}
      />,
    );
    expect(screen.getByRole("button", { name: /Download Template/i })).toBeInTheDocument();
  });

  // Shows upload CSV button in import section
  test("shows upload CSV button", () => {
    render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:import": true })}
      />,
    );
    expect(screen.getByRole("button", { name: /Upload CSV/i })).toBeInTheDocument();
  });

  // Opens import dialog when upload button is clicked
  test("opens import dialog on upload CSV click", () => {
    render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:import": true })}
      />,
    );
    expect(screen.queryByTestId("csv-import-dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Upload CSV/i }));
    expect(screen.getByTestId("csv-import-dialog")).toBeInTheDocument();
  });

  // Renders all export buttons with correct text
  test("each export card has an Export button", () => {
    render(
      <DataImportExport
        counts={defaultCounts}
        permissions={makePermissions({ "data:export": true, "admin:view_audit_log": true })}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: /Export/i });
    expect(buttons).toHaveLength(4);
  });

  // All export buttons are disabled when every count is zero
  test("disables all export buttons when all counts are zero", () => {
    const zeroCounts = { persons: 0, teams: 0, departments: 0, auditLogs: 0 };
    render(
      <DataImportExport
        counts={zeroCounts}
        permissions={makePermissions({ "data:export": true, "admin:view_audit_log": true })}
      />,
    );
    const buttons = screen.getAllByRole("button", { name: /Export/i });
    expect(buttons).toHaveLength(4);
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
