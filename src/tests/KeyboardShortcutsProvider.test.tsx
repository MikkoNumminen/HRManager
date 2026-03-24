import { render, screen, fireEvent, act } from "@testing-library/react";
import KeyboardShortcutsProvider, {
  useKeyboardShortcuts,
} from "../components/KeyboardShortcutsProvider";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => "/",
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Helper component to expose shortcuts context and render a search input.
function TestConsumer() {
  const { showHelp, helpOpen } = useKeyboardShortcuts();
  return (
    <div>
      <input data-keyboard-shortcut="search" data-testid="search" />
      <span data-testid="help-status">{helpOpen ? "open" : "closed"}</span>
      <button onClick={showHelp}>Open Help</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <KeyboardShortcutsProvider>
      <TestConsumer />
    </KeyboardShortcutsProvider>,
  );
}

beforeEach(() => {
  mockPush.mockClear();
});

describe("KeyboardShortcutsProvider", () => {
  // "?" key toggles the help dialog.
  test('pressing "?" opens the help dialog', () => {
    renderWithProvider();
    expect(screen.getByTestId("help-status")).toHaveTextContent("closed");

    fireEvent.keyDown(document, { key: "?" });
    expect(screen.getByTestId("help-status")).toHaveTextContent("open");
  });

  // "/" key focuses the search input.
  test('"/" focuses the search input', () => {
    renderWithProvider();
    const searchInput = screen.getByTestId("search");
    expect(document.activeElement).not.toBe(searchInput);

    fireEvent.keyDown(document, { key: "/" });
    expect(document.activeElement).toBe(searchInput);
  });

  // "g then d" navigates to dashboard.
  test('"g then d" navigates to /dashboard', () => {
    renderWithProvider();
    fireEvent.keyDown(document, { key: "g" });
    fireEvent.keyDown(document, { key: "d" });
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  // "g then p" navigates to persons.
  test('"g then p" navigates to /managePersons', () => {
    renderWithProvider();
    fireEvent.keyDown(document, { key: "g" });
    fireEvent.keyDown(document, { key: "p" });
    expect(mockPush).toHaveBeenCalledWith("/managePersons");
  });

  // "g then t" navigates to teams.
  test('"g then t" navigates to /manageTeams', () => {
    renderWithProvider();
    fireEvent.keyDown(document, { key: "g" });
    fireEvent.keyDown(document, { key: "t" });
    expect(mockPush).toHaveBeenCalledWith("/manageTeams");
  });

  // Shortcuts are ignored when typing in an input.
  test("ignores shortcuts when focused on input (except /)", () => {
    renderWithProvider();
    const searchInput = screen.getByTestId("search");
    searchInput.focus();

    fireEvent.keyDown(searchInput, { key: "g" });
    fireEvent.keyDown(searchInput, { key: "d" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  // Escape closes the help dialog.
  test("Escape closes help dialog", () => {
    renderWithProvider();
    fireEvent.keyDown(document, { key: "?" });
    expect(screen.getByTestId("help-status")).toHaveTextContent("open");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByTestId("help-status")).toHaveTextContent("closed");
  });

  // Help dialog shows shortcut descriptions.
  test("help dialog lists shortcut descriptions", () => {
    renderWithProvider();
    fireEvent.keyDown(document, { key: "?" });

    expect(screen.getByText("Focus search")).toBeInTheDocument();
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument();
  });
});
