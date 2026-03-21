import { render, screen, act } from "@testing-library/react";
import TutorialProvider, { useTutorial, useTutorialMaybe } from "../components/TutorialProvider";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { STORAGE_KEY } from "../tutorialConfig";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

const mockUseSession = useSession as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;

// Helper component that reads and displays tutorial context values
function TutorialConsumer() {
  const ctx = useTutorial();
  return (
    <div>
      <span data-testid="isActive">{String(ctx.isActive)}</span>
      <span data-testid="completedCount">{ctx.completedCount}</span>
      <span data-testid="totalSteps">{ctx.totalSteps}</span>
      <span data-testid="allComplete">{String(ctx.allComplete)}</span>
      <span data-testid="currentStep">{ctx.currentStep?.id ?? "none"}</span>
      <span data-testid="celebratingStep">{ctx.celebratingStep ?? "none"}</span>
      <button onClick={() => ctx.completeStep("add_person")}>complete-add-person</button>
      <button onClick={() => ctx.resetTutorial()}>reset</button>
      <button onClick={() => ctx.dismissCelebration()}>dismiss</button>
    </div>
  );
}

// Helper component that uses useTutorialMaybe outside provider
function MaybeConsumer() {
  const ctx = useTutorialMaybe();
  return <span data-testid="maybe">{ctx === null ? "null" : "present"}</span>;
}

describe("TutorialProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUsePathname.mockReturnValue("/");
  });

  // useTutorialMaybe returns null when no provider is present
  test("useTutorialMaybe returns null without provider", () => {
    render(<MaybeConsumer />);
    expect(screen.getByTestId("maybe")).toHaveTextContent("null");
  });

  // useTutorial throws when no provider is present
  test("useTutorial throws without provider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TutorialConsumer />)).toThrow(
      "useTutorial must be used within TutorialProvider",
    );
    consoleSpy.mockRestore();
  });

  // isActive is false for non-demo users
  test("isActive is false for non-demo users", () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "real@example.com" } },
      status: "authenticated",
    });
    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );
    expect(screen.getByTestId("isActive")).toHaveTextContent("false");
  });

  // isActive is false when unauthenticated
  test("isActive is false when unauthenticated", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );
    expect(screen.getByTestId("isActive")).toHaveTextContent("false");
  });

  // isActive is true for demo user
  test("isActive is true for demo user", () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });
    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );
    expect(screen.getByTestId("isActive")).toHaveTextContent("true");
  });

  // totalSteps shows the correct number of tutorial steps
  test("totalSteps is 8", () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });
    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );
    expect(screen.getByTestId("totalSteps")).toHaveTextContent("8");
  });

  // Auto-completes view_employees when demo user is on "/"
  test("auto-completes view_employees on home page for demo user", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });
    mockUsePathname.mockReturnValue("/");

    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );

    // view_employees auto-completes, so completedCount should be 1
    expect(screen.getByTestId("completedCount")).toHaveTextContent("1");
    // The current step should be add_person (the next incomplete step)
    expect(screen.getByTestId("currentStep")).toHaveTextContent("add_person");
  });

  // completeStep marks a step as done and triggers celebration
  test("completeStep marks step complete and triggers celebration", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });

    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );

    await act(async () => {
      screen.getByText("complete-add-person").click();
    });

    expect(screen.getByTestId("completedCount")).toHaveTextContent("2");
    expect(screen.getByTestId("celebratingStep")).toHaveTextContent("add_person");
  });

  // dismissCelebration clears the celebrating step
  test("dismissCelebration clears celebrating step", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });

    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );

    await act(async () => {
      screen.getByText("complete-add-person").click();
    });
    expect(screen.getByTestId("celebratingStep")).toHaveTextContent("add_person");

    await act(async () => {
      screen.getByText("dismiss").click();
    });
    expect(screen.getByTestId("celebratingStep")).toHaveTextContent("none");
  });

  // resetTutorial clears all progress
  test("resetTutorial clears all progress", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });

    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );

    // view_employees is auto-completed (1 step done)
    expect(screen.getByTestId("completedCount")).toHaveTextContent("1");

    await act(async () => {
      screen.getByText("reset").click();
    });

    // After reset, view_employees gets auto-completed again because we're on "/"
    // but the reset itself clears everything first
    expect(screen.getByTestId("currentStep")).toHaveTextContent("view_employees");
  });

  // Saves progress to localStorage
  test("saves progress to localStorage", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });

    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );

    await act(async () => {
      screen.getByText("complete-add-person").click();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    expect(stored).toContain("add_person");
    expect(stored).toContain("view_employees");
  });

  // Loads progress from localStorage on mount
  test("loads progress from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["view_employees", "add_person"]));
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });

    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );

    expect(screen.getByTestId("completedCount")).toHaveTextContent("2");
    expect(screen.getByTestId("currentStep")).toHaveTextContent("create_team");
  });

  // Listens for custom tutorial events and completes steps
  test("listens for custom events and completes steps", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });
    mockUsePathname.mockReturnValue("/managePersons");

    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent("tutorial:person_created"));
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    expect(stored).toContain("add_person");
  });

  // Does not complete steps for non-demo users even when events fire
  test("ignores events for non-demo users", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "real@example.com" } },
      status: "authenticated",
    });

    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );

    await act(async () => {
      window.dispatchEvent(new CustomEvent("tutorial:person_created"));
    });

    expect(screen.getByTestId("completedCount")).toHaveTextContent("0");
  });

  // Completing the same step twice does not increase the count
  test("completing same step twice is idempotent", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });

    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );

    await act(async () => {
      screen.getByText("complete-add-person").click();
    });
    const countAfterFirst = screen.getByTestId("completedCount").textContent;

    await act(async () => {
      screen.getByText("complete-add-person").click();
    });
    expect(screen.getByTestId("completedCount")).toHaveTextContent(countAfterFirst!);
  });

  // Auto-completes view_audit_log when on /admin/audit
  test("auto-completes view_audit_log on /admin/audit", () => {
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });
    mockUsePathname.mockReturnValue("/admin/audit");

    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    expect(stored).toContain("view_audit_log");
  });

  // Handles corrupted localStorage gracefully
  test("handles corrupted localStorage gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json");
    mockUseSession.mockReturnValue({
      data: { user: { email: "demo@hrmanager.app" } },
      status: "authenticated",
    });

    render(
      <TutorialProvider>
        <TutorialConsumer />
      </TutorialProvider>,
    );

    // Should start fresh (1 because view_employees auto-completes on /)
    expect(screen.getByTestId("completedCount")).toHaveTextContent("1");
  });

  // useTutorialMaybe returns context when provider is present
  test("useTutorialMaybe returns context when provider is present", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(
      <TutorialProvider>
        <MaybeConsumer />
      </TutorialProvider>,
    );
    expect(screen.getByTestId("maybe")).toHaveTextContent("present");
  });
});
