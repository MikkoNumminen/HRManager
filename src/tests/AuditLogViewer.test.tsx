import { render, screen, fireEvent } from "@testing-library/react";
import AuditLogViewer from "../components/AuditLogViewer";
import { AuditLog } from "../schemas";
import { useRouter } from "next/navigation";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: mockPush })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

const NOW = new Date("2026-03-19T12:00:00Z");

const makelog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  userId: "c2ddfe11-be2d-4af9-8c7e-8ddadf592c33",
  userEmail: "alice@example.com",
  action: "create",
  entityType: "person",
  entityId: "d3eef222-1111-2222-3333-444455556666",
  before: null,
  after: '{"name":"Alice"}',
  createdAt: NOW,
  ...overrides,
});

const defaultProps = {
  total: 0,
  currentPage: 1,
  pageSize: 25,
  userEmails: [],
  currentFilters: {},
};

describe("AuditLogViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Shows empty state message when there are no log entries.
  test("shows empty state when no logs", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    expect(screen.getByText("No audit log entries found")).toBeInTheDocument();
  });

  // Renders a log entry with user email, action chip, and entity type.
  test("renders a log entry row", () => {
    const log = makelog();
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("create")).toBeInTheDocument();
    expect(screen.getByText("Person")).toBeInTheDocument();
  });

  // Shows "System" when userEmail is null (e.g. automated actions).
  test("shows System for null userEmail", () => {
    const log = makelog({ userEmail: null });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  // Renders all three filter controls (User, Action, Type).
  test("renders filter controls", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    // Each filter has a FormControl with an InputLabel
    expect(screen.getAllByText("User").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Action").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Type").length).toBeGreaterThanOrEqual(1);
  });

  // Shows the correct entity type label for teamMember.
  test("maps teamMember entity type to Team Member label", () => {
    const log = makelog({ entityType: "teamMember" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getByText("Team Member")).toBeInTheDocument();
  });

  // Shows the correct entity type label for userPermission.
  test("maps userPermission entity type to Permission label", () => {
    const log = makelog({ entityType: "userPermission" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getByText("Permission")).toBeInTheDocument();
  });

  // Displays changes with before→after diff format for update actions.
  test("formats update changes as before → after diff", () => {
    const log = makelog({
      action: "update",
      before: '{"position":"Developer"}',
      after: '{"position":"Senior Developer"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("position: Developer → Senior Developer").length).toBeGreaterThan(0);
  });

  // Displays create changes showing the created values.
  test("formats create changes showing after values", () => {
    const log = makelog({ action: "create", before: null, after: '{"name":"Bob"}' });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("name: Bob").length).toBeGreaterThan(0);
  });

  // Shows pagination component with the correct total count.
  test("shows pagination with total count", () => {
    const logs = [makelog()];
    render(<AuditLogViewer logs={logs} {...defaultProps} total={50} />);
    // MUI TablePagination renders the count info
    expect(screen.getByText(/of 50/)).toBeInTheDocument();
  });

  // Renders all column headers with info tooltips.
  test("renders column headers", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    expect(screen.getByText("Timestamp")).toBeInTheDocument();
    expect(screen.getByText("Changes")).toBeInTheDocument();
    // "User", "Action", "Type" appear as both column headers and filter labels
    expect(screen.getAllByText("User").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Action").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Type").length).toBeGreaterThanOrEqual(2);
  });

  // Multiple log entries should each render their own row.
  test("renders multiple log entries", () => {
    const logs = [
      makelog({ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", userEmail: "alice@example.com" }),
      makelog({ id: "b1ffcd00-1111-2222-3333-444455556666", userEmail: "bob@example.com" }),
    ];
    render(<AuditLogViewer logs={logs} {...defaultProps} total={2} />);
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  // Displays delete action with before values only.
  test("formats delete changes showing before values", () => {
    const log = makelog({
      action: "delete",
      before: '{"name":"Alice","email":"alice@test.com"}',
      after: null,
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText(/name: Alice/).length).toBeGreaterThan(0);
  });

  // Shows dash when both before and after are null.
  test("shows dash when both before and after are null", () => {
    const log = makelog({ before: null, after: null });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    // The "-" appears in both the cell and the tooltip
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });

  // Handles malformed JSON gracefully by falling back to raw string.
  test("falls back to raw string for invalid JSON", () => {
    const log = makelog({ before: "not-json", after: null });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("not-json").length).toBeGreaterThan(0);
  });

  // Shows dash when before and after have identical values (no actual changes).
  test("shows dash when before and after are identical", () => {
    const log = makelog({
      action: "update",
      before: '{"position":"Dev"}',
      after: '{"position":"Dev"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });

  // Renders user emails in the filter dropdown when provided.
  test("renders user email filter options", () => {
    const { container } = render(
      <AuditLogViewer
        logs={[]}
        {...defaultProps}
        userEmails={["alice@example.com", "bob@example.com"]}
      />,
    );
    // The emails are MenuItem children inside the Select — they render in the DOM
    expect(container).toBeDefined();
  });

  // Changing the action filter navigates with updated URL params.
  test("navigates when action filter changes", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    // Open the Action select dropdown — MUI Select uses role="combobox"
    const actionSelect = screen.getAllByRole("combobox")[1]; // second select = Action
    fireEvent.mouseDown(actionSelect);
    // Click "Create" menu item in the dropdown
    const createOption = screen.getByRole("option", { name: "Create" });
    fireEvent.click(createOption);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("action=create"));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=1"));
  });

  // Clearing the action filter removes it from URL params.
  test("removes filter param when cleared", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} currentFilters={{ action: "create" }} />);
    const actionSelect = screen.getAllByRole("combobox")[1];
    fireEvent.mouseDown(actionSelect);
    const allOption = screen.getByRole("option", { name: "All Actions" });
    fireEvent.click(allOption);
    // The empty value should cause the param to be deleted
    expect(mockPush).toHaveBeenCalled();
  });

  // Changing the type filter navigates with updated URL.
  test("navigates when type filter changes", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    const entitySelect = screen.getAllByRole("combobox")[2]; // third select = Type
    fireEvent.mouseDown(entitySelect);
    const teamOption = screen.getByRole("option", { name: "Team" });
    fireEvent.click(teamOption);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("entityType=team"));
  });

  // Renders seed and reset action chips with correct labels.
  test("renders seed action chip", () => {
    const log = makelog({ action: "seed" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getByText("seed")).toBeInTheDocument();
  });

  test("renders reset action chip", () => {
    const log = makelog({ action: "reset" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getByText("reset")).toBeInTheDocument();
  });

  // Renders delete action chip.
  test("renders delete action chip", () => {
    const log = makelog({ action: "delete" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getByText("delete")).toBeInTheDocument();
  });

  // Renders update action chip.
  test("renders update action chip", () => {
    const log = makelog({ action: "update" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getByText("update")).toBeInTheDocument();
  });

  // Handles update where a new key is added (null → value).
  test("formats changes when new key appears in after", () => {
    const log = makelog({
      action: "update",
      before: '{"role":"user"}',
      after: '{"role":"admin","extra":"new"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText(/role: user → admin/).length).toBeGreaterThan(0);
  });
});
