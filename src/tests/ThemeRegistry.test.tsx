import { render, screen, fireEvent } from "@testing-library/react";
import ThemeRegistry, { useTheme } from "../components/shared/ThemeRegistry";
import { THEME_STORAGE_KEY, DEFAULT_THEME } from "../themeConfig";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Helper component to expose theme context values
function ThemeConsumer() {
  const { currentTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{currentTheme}</span>
      <button onClick={() => setTheme("cyberpunk")}>Switch to cyberpunk</button>
      <button onClick={() => setTheme("light")}>Switch to light</button>
    </div>
  );
}

describe("ThemeRegistry", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Renders children inside the provider
  test("renders children", () => {
    render(
      <ThemeRegistry>
        <div>Hello</div>
      </ThemeRegistry>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  // Defaults to dark theme when localStorage is empty
  test("defaults to dark theme", () => {
    render(
      <ThemeRegistry>
        <ThemeConsumer />
      </ThemeRegistry>,
    );
    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
  });

  // Loads theme from localStorage on mount
  test("loads theme from localStorage", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "ocean");
    render(
      <ThemeRegistry>
        <ThemeConsumer />
      </ThemeRegistry>,
    );
    await screen.findByText("ocean");
    expect(screen.getByTestId("current-theme")).toHaveTextContent("ocean");
  });

  // Falls back to dark for invalid localStorage values
  test("falls back to dark for invalid stored theme", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "nonexistent-theme");
    render(
      <ThemeRegistry>
        <ThemeConsumer />
      </ThemeRegistry>,
    );
    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
  });

  // setTheme updates the current theme
  test("setTheme updates current theme", () => {
    render(
      <ThemeRegistry>
        <ThemeConsumer />
      </ThemeRegistry>,
    );
    fireEvent.click(screen.getByText("Switch to cyberpunk"));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("cyberpunk");
  });

  // setTheme persists to localStorage
  test("setTheme saves to localStorage", () => {
    render(
      <ThemeRegistry>
        <ThemeConsumer />
      </ThemeRegistry>,
    );
    fireEvent.click(screen.getByText("Switch to light"));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  // Multiple theme switches update correctly
  test("multiple theme switches work correctly", () => {
    render(
      <ThemeRegistry>
        <ThemeConsumer />
      </ThemeRegistry>,
    );
    fireEvent.click(screen.getByText("Switch to cyberpunk"));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("cyberpunk");

    fireEvent.click(screen.getByText("Switch to light"));
    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  // useTheme returns default values outside provider
  test("useTheme returns defaults outside provider", () => {
    function Standalone() {
      const { currentTheme } = useTheme();
      return <span>{currentTheme}</span>;
    }
    render(<Standalone />);
    expect(screen.getByText(DEFAULT_THEME)).toBeInTheDocument();
  });
});
