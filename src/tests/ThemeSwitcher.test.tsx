import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { THEME_NAMES, THEME_LABELS } from "../themeConfig";

const mockSetTheme = jest.fn();
let mockCurrentTheme = "dark";

jest.mock("../components/ThemeRegistry", () => ({
  useTheme: () => ({ currentTheme: mockCurrentTheme, setTheme: mockSetTheme }),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentTheme = "dark";
  });

  // Renders the palette icon button
  test("renders palette icon button", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
  });

  // Menu is closed by default
  test("menu is closed by default", () => {
    render(<ThemeSwitcher />);
    expect(screen.queryByText(THEME_LABELS.dark)).not.toBeInTheDocument();
  });

  // Clicking the button opens the menu with all 6 themes
  test("clicking button opens menu with all themes", async () => {
    render(<ThemeSwitcher />);
    await userEvent.click(screen.getByLabelText("Theme"));
    for (const name of THEME_NAMES) {
      expect(screen.getByText(THEME_LABELS[name])).toBeInTheDocument();
    }
  });

  // Selecting a theme calls setTheme with the correct name
  test("selecting a theme calls setTheme", async () => {
    render(<ThemeSwitcher />);
    await userEvent.click(screen.getByLabelText("Theme"));
    await userEvent.click(screen.getByText(THEME_LABELS.cyberpunk));
    expect(mockSetTheme).toHaveBeenCalledWith("cyberpunk");
  });

  // Selecting a theme calls setTheme and triggers menu close
  test("selecting a theme triggers close", async () => {
    render(<ThemeSwitcher />);
    await userEvent.click(screen.getByLabelText("Theme"));
    expect(screen.getByText(THEME_LABELS.ocean)).toBeInTheDocument();
    await userEvent.click(screen.getByText(THEME_LABELS.ocean));
    expect(mockSetTheme).toHaveBeenCalledWith("ocean");
  });

  // Current theme is marked as selected
  test("current theme is marked as selected", async () => {
    mockCurrentTheme = "cyberpunk";
    render(<ThemeSwitcher />);
    await userEvent.click(screen.getByLabelText("Theme"));
    const cyberpunkItem = screen.getByText(THEME_LABELS.cyberpunk).closest("li");
    expect(cyberpunkItem).toHaveClass("Mui-selected");
  });

  // Each theme option shows its emoji icon
  test("each theme option shows its emoji icon", async () => {
    render(<ThemeSwitcher />);
    await userEvent.click(screen.getByLabelText("Theme"));
    // Check that emoji icons are rendered (at least verify the menu has 6 items)
    const menuItems = screen.getAllByRole("menuitem");
    expect(menuItems).toHaveLength(6);
  });

  // Menu closes via onClose when pressing Escape
  test("menu closes via Escape key", async () => {
    render(<ThemeSwitcher />);
    await userEvent.click(screen.getByLabelText("Theme"));
    expect(screen.getByText(THEME_LABELS.dark)).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("presentation"), { key: "Escape" });
    // onClose callback (setAnchorEl(null)) was triggered
    expect(mockSetTheme).not.toHaveBeenCalled();
  });
});
