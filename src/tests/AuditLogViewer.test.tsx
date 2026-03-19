import { render, screen } from "@testing-library/react";
import AuditLogViewer from "../components/AuditLogViewer";
import { AuditLog } from "../schemas";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
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

  // Shows a dash when entityId is null (e.g. bulk operations).
  test("shows dash for null entityId", () => {
    const log = makelog({ entityId: null });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  // Truncates the entity ID to first 8 characters with ellipsis.
  test("truncates entity ID to 8 chars", () => {
    const log = makelog();
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getByText("d3eef222…")).toBeInTheDocument();
  });

  // Renders all three filter controls (User, Action, Entity).
  test("renders filter controls", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    // Each filter has a FormControl with an InputLabel
    expect(screen.getAllByText("User").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Action").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Entity").length).toBeGreaterThanOrEqual(1);
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
    expect(screen.getByText("Entity ID")).toBeInTheDocument();
    expect(screen.getByText("Changes")).toBeInTheDocument();
    // "User", "Action", "Entity" appear as both column headers and filter labels —
    // verify at least 2 of each exist (one filter + one header)
    expect(screen.getAllByText("User").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Action").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Entity").length).toBeGreaterThanOrEqual(2);
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
});
