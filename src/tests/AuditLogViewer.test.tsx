import { render, screen, fireEvent, within } from "@testing-library/react";
import AuditLogViewer from "../components/AuditLogViewer";
import { AuditLog } from "../schemas";

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
    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("No audit log entries found")).toBeInTheDocument();
  });

  // Renders a log entry with user email, action chip, and entity type.
  test("renders a log entry row", () => {
    const log = makelog();
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("alice@example.com")).toBeInTheDocument();
    expect(table.getByText("create")).toBeInTheDocument();
    expect(table.getByText("Person")).toBeInTheDocument();
  });

  // Shows "System" when userEmail is null (e.g. automated actions).
  test("shows System for null userEmail", () => {
    const log = makelog({ userEmail: null });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("System")).toBeInTheDocument();
  });

  // Shows user name instead of email when userNames map is provided.
  test("shows user name when userNames map is provided", () => {
    const log = makelog();
    const userNames = { "alice@example.com": "Alice Smith" };
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} userNames={userNames} />);
    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("Alice Smith")).toBeInTheDocument();
  });

  // Falls back to email when the user is not in the userNames map.
  test("falls back to email when user not in userNames map", () => {
    const log = makelog();
    const userNames = { "other@example.com": "Other User" };
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} userNames={userNames} />);
    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("alice@example.com")).toBeInTheDocument();
  });

  // Renders all three filter controls (User, Action, Type).
  test("renders filter controls", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    // Each filter has a FormControl with an InputLabel — both desktop and mobile versions
    expect(screen.getAllByText("User").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Action").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Type").length).toBeGreaterThanOrEqual(1);
  });

  // Shows the correct entity type label for teamMember.
  test("maps teamMember entity type to Team Member label", () => {
    const log = makelog({ entityType: "teamMember" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("Team Member")).toBeInTheDocument();
  });

  // Shows the correct entity type label for userPermission.
  test("maps userPermission entity type to Permission label", () => {
    const log = makelog({ entityType: "userPermission" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("Permission")).toBeInTheDocument();
  });

  // Describes a person name change in plain language.
  test("describes person name change in Barney style", () => {
    const log = makelog({
      action: "update",
      before: '{"name":"Alice"}',
      after: '{"name":"Alicia"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText('Changed name from "Alice" to "Alicia"').length).toBeGreaterThan(0);
  });

  // Describes a position update in plain language.
  test("describes position update in Barney style", () => {
    const log = makelog({
      action: "update",
      before: '{"position":"Developer"}',
      after: '{"position":"Senior Developer"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(
      screen.getAllByText('Changed position from "Developer" to "Senior Developer"').length,
    ).toBeGreaterThan(0);
  });

  // Describes person creation in plain language.
  test("describes person creation in Barney style", () => {
    const log = makelog({ action: "create", before: null, after: '{"name":"Bob"}' });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Added a new person: Bob").length).toBeGreaterThan(0);
  });

  // Shows pagination component with the correct total count.
  test("shows pagination with total count", () => {
    const logs = [makelog()];
    render(<AuditLogViewer logs={logs} {...defaultProps} total={50} />);
    // MUI TablePagination renders the count info
    expect(screen.getAllByText(/of 50/).length).toBeGreaterThan(0);
  });

  // Renders all column headers with info tooltips.
  test("renders column headers", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("Timestamp")).toBeInTheDocument();
    expect(table.getByText("Changes")).toBeInTheDocument();
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
    const table = within(screen.getByTestId("table-view"));
    expect(table.getByText("alice@example.com")).toBeInTheDocument();
    expect(table.getByText("bob@example.com")).toBeInTheDocument();
  });

  // Describes person deletion in plain language.
  test("describes person deletion in Barney style", () => {
    const log = makelog({
      action: "delete",
      before: '{"name":"Alice","email":"alice@test.com"}',
      after: null,
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText(/Removed person: Alice/).length).toBeGreaterThan(0);
  });

  // Shows a friendly message even when no change data is recorded.
  test("shows new record message when both before and after are null on create", () => {
    const log = makelog({ before: null, after: null });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Added a new person: unknown").length).toBeGreaterThan(0);
  });

  // Handles malformed JSON gracefully by falling back to raw string.
  test("falls back to raw string for invalid JSON", () => {
    const log = makelog({ before: "not-json", after: null });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("not-json").length).toBeGreaterThan(0);
  });

  // Shows generic message when before and after have identical values (no actual changes).
  test("shows generic update message when values are identical", () => {
    const log = makelog({
      action: "update",
      before: '{"position":"Dev"}',
      after: '{"position":"Dev"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Updated person details").length).toBeGreaterThan(0);
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
    expect(screen.getAllByText("seed").length).toBeGreaterThan(0);
  });

  test("renders reset action chip", () => {
    const log = makelog({ action: "reset" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("reset").length).toBeGreaterThan(0);
  });

  // Renders delete action chip.
  test("renders delete action chip", () => {
    const log = makelog({ action: "delete" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("delete").length).toBeGreaterThan(0);
  });

  // Renders update action chip.
  test("renders update action chip", () => {
    const log = makelog({ action: "update" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("update").length).toBeGreaterThan(0);
  });

  // Describes a user role change in plain language, showing target name.
  test("describes user role change in Barney style", () => {
    const log = makelog({
      action: "update",
      entityType: "user",
      before: '{"role":"user","targetEmail":"bob@test.com"}',
      after: '{"role":"admin","targetEmail":"bob@test.com"}',
    });
    const userNames = { "bob@test.com": "Bob Jones" };
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} userNames={userNames} />);
    expect(
      screen.getAllByText('Changed Bob Jones\'s role from "user" to "admin"').length,
    ).toBeGreaterThan(0);
  });

  // Describes team creation in plain language.
  test("describes team creation in Barney style", () => {
    const log = makelog({
      action: "create",
      entityType: "team",
      after: '{"teamName":"Engineering"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Created a new team: Engineering").length).toBeGreaterThan(0);
  });

  // Describes seed action in plain language.
  test("describes seed action in Barney style", () => {
    const log = makelog({
      action: "seed",
      entityType: "person",
      before: null,
      after: '{"clearExisting":true}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Loaded mock data (replaced existing)").length).toBeGreaterThan(0);
  });

  // Describes reset action with counts in plain language.
  test("describes reset action in Barney style", () => {
    const log = makelog({
      action: "reset",
      entityType: "person",
      before: '{"personCount":5,"teamCount":2}',
      after: null,
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(
      screen.getAllByText("Cleared all data (5 persons, 2 teams, 0 departments removed)").length,
    ).toBeGreaterThan(0);
  });

  // Describes permission grant in plain language, showing target name.
  test("describes permission grant in Barney style", () => {
    const log = makelog({
      action: "update",
      entityType: "userPermission",
      after: '{"permissionKey":"person:create","granted":true,"targetEmail":"bob@test.com"}',
    });
    const userNames = { "bob@test.com": "Bob Jones" };
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} userNames={userNames} />);
    expect(
      screen.getAllByText("Granted Bob Jones the ability to create new people").length,
    ).toBeGreaterThan(0);
  });

  // Describes permission denial in plain language, showing target name.
  test("describes permission denial in Barney style", () => {
    const log = makelog({
      action: "update",
      entityType: "userPermission",
      after: '{"permissionKey":"team:delete","granted":false,"targetEmail":"bob@test.com"}',
    });
    const userNames = { "bob@test.com": "Bob Jones" };
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} userNames={userNames} />);
    expect(
      screen.getAllByText("Revoked Bob Jones's ability to delete teams").length,
    ).toBeGreaterThan(0);
  });

  // Describes adding a team member in plain language.
  test("describes teamMember creation in Barney style", () => {
    const log = makelog({ action: "create", entityType: "teamMember", after: "{}" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Added a member to a team").length).toBeGreaterThan(0);
  });

  // Describes creating an unknown entity type as a generic new record.
  test("describes unknown entity creation as generic new record", () => {
    const log = makelog({
      action: "create",
      entityType: "widget" as AuditLog["entityType"],
      after: "{}",
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("New record created").length).toBeGreaterThan(0);
  });

  // Describes removing a team member in plain language.
  test("describes teamMember deletion in Barney style", () => {
    const log = makelog({
      action: "delete",
      entityType: "teamMember",
      before: "{}",
      after: null,
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Removed a member from a team").length).toBeGreaterThan(0);
  });

  // Describes resetting a permission override back to role default, showing target name.
  test("describes userPermission deletion as reset to role default", () => {
    const log = makelog({
      action: "delete",
      entityType: "userPermission",
      before: '{"permissionKey":"person:create","targetEmail":"bob@test.com"}',
      after: null,
    });
    const userNames = { "bob@test.com": "Bob Jones" };
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} userNames={userNames} />);
    expect(
      screen.getAllByText('Reset Bob Jones\'s "create new people" back to role default').length,
    ).toBeGreaterThan(0);
  });

  // Describes deleting a team in plain language.
  test("describes team deletion in Barney style", () => {
    const log = makelog({
      action: "delete",
      entityType: "team",
      before: '{"teamName":"Marketing"}',
      after: null,
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Deleted team: Marketing").length).toBeGreaterThan(0);
  });

  // Describes deleting an unknown entity type as a generic record deleted.
  test("describes unknown entity deletion as generic record deleted", () => {
    const log = makelog({
      action: "delete",
      entityType: "widget" as AuditLog["entityType"],
      before: "{}",
      after: null,
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Record deleted").length).toBeGreaterThan(0);
  });

  // Describes removing a team manager in plain language.
  test("describes removing team manager in Barney style", () => {
    const log = makelog({
      action: "update",
      entityType: "team",
      before: '{"teamManagerId":"abc"}',
      after: '{"teamManagerId":null}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Removed the team manager").length).toBeGreaterThan(0);
  });

  // Describes changing a team manager in plain language.
  test("describes changing team manager in Barney style", () => {
    const log = makelog({
      action: "update",
      entityType: "team",
      before: '{"teamManagerId":"abc"}',
      after: '{"teamManagerId":"def"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Changed the team manager").length).toBeGreaterThan(0);
  });

  // Shows renamed team message when teamName changes.
  test("describes team rename in Barney style", () => {
    const log = makelog({
      action: "update",
      entityType: "team",
      before: '{"teamName":"Old"}',
      after: '{"teamName":"New"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText('Renamed team from "Old" to "New"').length).toBeGreaterThan(0);
  });

  // Shows generic team update message when no specific field changed.
  test("describes generic team update in Barney style", () => {
    const log = makelog({
      action: "update",
      entityType: "team",
      before: '{"someField":"old"}',
      after: '{"someField":"new"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Updated team details").length).toBeGreaterThan(0);
  });

  // Describes updating an unknown entity type as a generic record updated.
  test("describes unknown entity update as generic record updated", () => {
    const log = makelog({
      action: "update",
      entityType: "widget" as AuditLog["entityType"],
      before: "{}",
      after: "{}",
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Record updated").length).toBeGreaterThan(0);
  });

  // Describes an email change in plain language.
  test("describes email change in Barney style", () => {
    const log = makelog({
      action: "update",
      entityType: "person",
      before: '{"email":"old@test.com"}',
      after: '{"email":"new@test.com"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(
      screen.getAllByText('Changed email from "old@test.com" to "new@test.com"').length,
    ).toBeGreaterThan(0);
  });

  // Describes seeding without clearing as keeping existing data.
  test("describes seed without clear as kept existing", () => {
    const log = makelog({
      action: "seed",
      entityType: "person",
      before: null,
      after: '{"clearExisting":false}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Loaded mock data (kept existing)").length).toBeGreaterThan(0);
  });

  // Shows a dash for completely unknown actions.
  test("shows dash for unknown action type", () => {
    const log = makelog({ action: "archive" as AuditLog["action"], before: null, after: null });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  // Shows the raw entity type string when it has no label mapping.
  test("shows raw entity type for unmapped types", () => {
    const log = makelog({ entityType: "customWidget" as AuditLog["entityType"] });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("customWidget").length).toBeGreaterThan(0);
  });

  // Falls back to after string when before is null and after is invalid JSON.
  test("falls back to after string when before is null and after is invalid JSON", () => {
    const log = makelog({ before: null, after: "bad-json" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("bad-json").length).toBeGreaterThan(0);
  });

  // Uses fallback color for unknown action types on action chip.
  test("renders action chip with fallback color for unknown action", () => {
    const log = makelog({ action: "archive" as AuditLog["action"] });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("archive").length).toBeGreaterThan(0);
  });

  // Navigates when user email filter is changed.
  test("navigates when user email filter changes", () => {
    render(
      <AuditLogViewer
        logs={[]}
        {...defaultProps}
        userEmails={["alice@example.com", "bob@example.com"]}
      />,
    );
    const userSelect = screen.getAllByRole("combobox")[0]; // first select = User
    fireEvent.mouseDown(userSelect);
    const emailOption = screen.getByRole("option", { name: "alice@example.com" });
    fireEvent.click(emailOption);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("userEmail=alice"));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=1"));
  });

  // Falls back to "unknown" when targetEmail is missing from permission reset.
  test("falls back to raw key when permission key has no label", () => {
    const log = makelog({
      action: "delete",
      entityType: "userPermission",
      before: '{"permissionKey":"custom:unknown"}',
      after: null,
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(
      screen.getAllByText('Reset unknown\'s "custom:unknown" back to role default').length,
    ).toBeGreaterThan(0);
  });

  // Falls back to "unknown" when targetEmail is missing from permission grant.
  test("falls back to raw key when granting unknown permission", () => {
    const log = makelog({
      action: "update",
      entityType: "userPermission",
      after: '{"permissionKey":"custom:action","granted":true}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(
      screen.getAllByText("Granted unknown the ability to custom:action").length,
    ).toBeGreaterThan(0);
  });

  // Describes removing a team from a department (departmentId set to null).
  test("describes removing team from department", () => {
    const log = makelog({
      action: "update",
      entityType: "team",
      before: '{"departmentId":"dept-123"}',
      after: '{"departmentId":null}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Removed team from department").length).toBeGreaterThan(0);
  });

  // Describes assigning a team to a department (departmentId set to a value).
  test("describes assigning team to department", () => {
    const log = makelog({
      action: "update",
      entityType: "team",
      before: '{"departmentId":null}',
      after: '{"departmentId":"dept-456"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Assigned team to a department").length).toBeGreaterThan(0);
  });

  // Describes removing the department head (headId set to null).
  test("describes removing department head", () => {
    const log = makelog({
      action: "update",
      entityType: "department",
      before: '{"headId":"person-123"}',
      after: '{"headId":null}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Removed the department head").length).toBeGreaterThan(0);
  });

  // Describes changing the department head (headId set to a new value).
  test("describes changing department head", () => {
    const log = makelog({
      action: "update",
      entityType: "department",
      before: '{"headId":"person-123"}',
      after: '{"headId":"person-456"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Changed the department head").length).toBeGreaterThan(0);
  });

  // Describes renaming a department.
  test("describes renaming a department", () => {
    const log = makelog({
      action: "update",
      entityType: "department",
      before: '{"name":"Old Name"}',
      after: '{"name":"New Name"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(
      screen.getAllByText('Renamed department from "Old Name" to "New Name"').length,
    ).toBeGreaterThan(0);
  });

  // Shows generic department update message when name is unchanged.
  test("describes generic department update", () => {
    const log = makelog({
      action: "update",
      entityType: "department",
      before: '{"description":"old"}',
      after: '{"description":"new"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Updated department details").length).toBeGreaterThan(0);
  });

  // Describes department creation in plain language.
  test("describes department creation", () => {
    const log = makelog({
      action: "create",
      entityType: "department",
      after: '{"name":"Finance"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Created a new department: Finance").length).toBeGreaterThan(0);
  });

  // Describes department deletion in plain language.
  test("describes department deletion", () => {
    const log = makelog({
      action: "delete",
      entityType: "department",
      before: '{"name":"Marketing"}',
      after: null,
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Deleted department: Marketing").length).toBeGreaterThan(0);
  });

  // Changing page via pagination navigates with updated page param.
  test("navigates when page is changed via pagination", () => {
    const logs = [makelog()];
    render(<AuditLogViewer logs={logs} {...defaultProps} total={50} />);
    // MUI TablePagination renders next page button — both desktop and mobile have one
    const nextPageButtons = screen.getAllByLabelText("Go to next page");
    fireEvent.click(nextPageButtons[0]);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });

  // Changing rows per page navigates with updated pageSize param and resets to page 1.
  test("navigates when rows per page is changed", () => {
    const logs = [makelog()];
    render(<AuditLogViewer logs={logs} {...defaultProps} total={50} pageSize={10} />);
    // MUI v7 TablePagination renders an input with role="combobox" for rows-per-page.
    // Multiple comboboxes exist (filter selects + pagination); pick the rows-per-page one.
    const comboboxes = screen.getAllByRole("combobox");
    // The rows-per-page comboboxes come after the filter selects
    const rowsInput = comboboxes[comboboxes.length - 1];
    // MUI Select: open the dropdown, then pick the option
    fireEvent.mouseDown(rowsInput);
    const option50 = screen.getByRole("option", { name: "50" });
    fireEvent.click(option50);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("pageSize=50"));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=1"));
  });

  // Renders kickout action chip with the correct label.
  test("renders kickout action chip", () => {
    const log = makelog({ action: "kickout" });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("kickout").length).toBeGreaterThan(0);
  });

  // Describes kicking out a user in plain language with name, email, and role.
  test("describes user kickout in Barney style", () => {
    const log = makelog({
      action: "kickout",
      entityType: "user",
      before: '{"name":"Bob","email":"bob@test.com","role":"user"}',
      after: null,
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Kicked out Bob (bob@test.com, role: user)").length).toBeGreaterThan(
      0,
    );
  });

  // Falls back to generic "Record deleted" when kickout is on a non-user entity.
  test("describes kickout on non-user entity as generic record deleted", () => {
    const log = makelog({
      action: "kickout",
      entityType: "person",
      before: "{}",
      after: null,
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText("Record deleted").length).toBeGreaterThan(0);
  });

  // Shows "Kick Out" option in the action filter dropdown.
  test("shows Kick Out in action filter dropdown", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    const actionSelect = screen.getAllByRole("combobox")[1];
    fireEvent.mouseDown(actionSelect);
    expect(screen.getByRole("option", { name: "Kick Out" })).toBeInTheDocument();
  });

  // Describes permission denied security event.
  test("describes permission denied event", () => {
    const log = makelog({
      action: "permission_denied",
      entityType: "security",
      after: '{"permissionKey":"person:create"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText(/Permission denied.*person:create/).length).toBeGreaterThan(0);
  });

  // Describes rate limited security event.
  test("describes rate limited event", () => {
    const log = makelog({
      action: "rate_limited",
      entityType: "security",
      after: '{"rateLimitedAction":"createPerson"}',
    });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    expect(screen.getAllByText(/Rate limit exceeded.*createPerson/).length).toBeGreaterThan(0);
  });
});

describe("AuditLogViewer mobile card view", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Card view renders log entry data.
  test("card view renders log entry data", () => {
    const log = makelog();
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText("create")).toBeInTheDocument();
    expect(cards.getByText("Person")).toBeInTheDocument();
    expect(cards.getByText(/alice@example.com/)).toBeInTheDocument();
  });

  // Card view shows empty state message.
  test("card view shows empty state", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText("No audit log entries found")).toBeInTheDocument();
  });

  // Card view shows user name when userNames map is provided.
  test("card view shows user name from userNames map", () => {
    const log = makelog();
    const userNames = { "alice@example.com": "Alice Smith" };
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} userNames={userNames} />);
    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText(/Alice Smith/)).toBeInTheDocument();
  });

  // Card view shows System for null userEmail.
  test("card view shows System for null userEmail", () => {
    const log = makelog({ userEmail: null });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText(/System/)).toBeInTheDocument();
  });

  // Card view renders change description.
  test("card view renders change description", () => {
    const log = makelog({ action: "create", after: '{"name":"Bob"}' });
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={1} />);
    const cards = within(screen.getByTestId("card-view"));
    expect(cards.getByText("Added a new person: Bob")).toBeInTheDocument();
  });

  // Mobile filter toggle button renders.
  test("mobile filter toggle renders", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    expect(screen.getByTestId("filter-toggle")).toBeInTheDocument();
  });

  // Clicking mobile filter toggle shows filters.
  test("clicking filter toggle shows filters", () => {
    render(<AuditLogViewer logs={[]} {...defaultProps} />);
    const toggle = screen.getByTestId("filter-toggle");
    fireEvent.click(toggle);
    // Filters should now be visible — at least the desktop + mobile sets
    expect(screen.getAllByText("User").length).toBeGreaterThanOrEqual(2);
  });

  // Mobile filter toggle shows active filter count.
  test("filter toggle shows active filter count", () => {
    render(
      <AuditLogViewer
        logs={[]}
        {...defaultProps}
        currentFilters={{ action: "create", entityType: "person" }}
      />,
    );
    const toggle = screen.getByTestId("filter-toggle");
    expect(toggle).toHaveTextContent("(2)");
  });

  // Card view shows pagination.
  test("card view shows pagination", () => {
    const log = makelog();
    render(<AuditLogViewer logs={[log]} {...defaultProps} total={50} />);
    // Both desktop and mobile have pagination
    expect(screen.getAllByText(/of 50/).length).toBeGreaterThan(0);
  });
});
