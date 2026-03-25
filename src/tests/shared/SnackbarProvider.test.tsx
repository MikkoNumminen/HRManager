import { render, screen, waitFor, fireEvent } from "@testing-library/react";

// Unmock SnackbarProvider so we can test the real implementation
jest.unmock("@/components/shared/SnackbarProvider");

// Use fake timers to prevent MUI Snackbar's autoHideDuration (4000ms) from keeping
// Jest alive after tests complete. We advance timers explicitly where needed.
beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());

// Must import AFTER unmock
import SnackbarProvider, { useSnackbar } from "@/components/shared/SnackbarProvider";

// Helper component that exposes the snackbar context for testing
function SnackbarConsumer() {
  const { showSnackbar } = useSnackbar();
  return (
    <div>
      <button onClick={() => showSnackbar("Success message")}>Show Success</button>
      <button onClick={() => showSnackbar("Error occurred", "error")}>Show Error</button>
      <button onClick={() => showSnackbar("Info notice", "info")}>Show Info</button>
      <button onClick={() => showSnackbar("Warning alert", "warning")}>Show Warning</button>
    </div>
  );
}

describe("SnackbarProvider", () => {
  // Renders children inside the provider
  test("renders children", () => {
    render(
      <SnackbarProvider>
        <div>Hello</div>
      </SnackbarProvider>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  // Shows success snackbar with the correct message
  test("shows success snackbar when triggered", () => {
    render(
      <SnackbarProvider>
        <SnackbarConsumer />
      </SnackbarProvider>,
    );
    fireEvent.click(screen.getByText("Show Success"));
    expect(screen.getByText("Success message")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  // Shows error snackbar with the correct severity
  test("shows error snackbar with error severity", () => {
    render(
      <SnackbarProvider>
        <SnackbarConsumer />
      </SnackbarProvider>,
    );
    fireEvent.click(screen.getByText("Show Error"));
    expect(screen.getByText("Error occurred")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("MuiAlert-filledError");
  });

  // Shows info snackbar with info severity
  test("shows info snackbar with info severity", () => {
    render(
      <SnackbarProvider>
        <SnackbarConsumer />
      </SnackbarProvider>,
    );
    fireEvent.click(screen.getByText("Show Info"));
    expect(screen.getByText("Info notice")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("MuiAlert-filledInfo");
  });

  // Shows warning snackbar with warning severity
  test("shows warning snackbar with warning severity", () => {
    render(
      <SnackbarProvider>
        <SnackbarConsumer />
      </SnackbarProvider>,
    );
    fireEvent.click(screen.getByText("Show Warning"));
    expect(screen.getByText("Warning alert")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveClass("MuiAlert-filledWarning");
  });

  // Defaults to success severity when none is specified
  test("defaults to success severity", () => {
    render(
      <SnackbarProvider>
        <SnackbarConsumer />
      </SnackbarProvider>,
    );
    fireEvent.click(screen.getByText("Show Success"));
    expect(screen.getByRole("alert")).toHaveClass("MuiAlert-filledSuccess");
  });

  // Snackbar can be dismissed by clicking the close button
  test("closes snackbar when close button is clicked", async () => {
    render(
      <SnackbarProvider>
        <SnackbarConsumer />
      </SnackbarProvider>,
    );
    fireEvent.click(screen.getByText("Show Success"));
    expect(screen.getByText("Success message")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Close"));
    await waitFor(() => {
      expect(screen.queryByText("Success message")).not.toBeInTheDocument();
    });
  });

  // Showing a new snackbar replaces the previous message
  test("replaces previous message when new snackbar is shown", async () => {
    render(
      <SnackbarProvider>
        <SnackbarConsumer />
      </SnackbarProvider>,
    );
    fireEvent.click(screen.getByText("Show Success"));
    expect(screen.getByText("Success message")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Show Error"));
    await waitFor(() => {
      expect(screen.getByText("Error occurred")).toBeInTheDocument();
    });
  });

  // useSnackbar returns no-op function outside provider (default context)
  test("useSnackbar returns no-op showSnackbar outside provider", () => {
    function Standalone() {
      const { showSnackbar } = useSnackbar();
      return <button onClick={() => showSnackbar("test")}>Trigger</button>;
    }
    // Should render without crashing even outside provider
    render(<Standalone />);
    expect(screen.getByText("Trigger")).toBeInTheDocument();
    // Clicking should not throw
    fireEvent.click(screen.getByText("Trigger"));
  });
});
