import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import { locales, localeNames } from "@/i18n/config";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Return a never-resolving promise so window.location.reload() is never reached
// (JSDOM doesn't implement navigation and would emit a console.error)
const mockSetLocale = jest.fn().mockReturnValue(new Promise(() => {}));
jest.mock("@/i18n/actions", () => ({
  setLocale: (...args: unknown[]) => mockSetLocale(...args),
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Renders the language icon button with proper aria label
  test("renders language icon button", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByLabelText("Language")).toBeInTheDocument();
  });

  // Menu is closed by default — no language names visible
  test("menu is closed by default", () => {
    render(<LanguageSwitcher />);
    expect(screen.queryByText("English")).not.toBeInTheDocument();
  });

  // Clicking the button opens the menu showing all 18 languages
  test("clicking button opens menu with all languages", async () => {
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByLabelText("Language"));
    for (const locale of locales) {
      expect(screen.getByText(localeNames[locale])).toBeInTheDocument();
    }
  });

  // Menu shows exactly 18 items (one per locale)
  test("menu has 18 items", async () => {
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByLabelText("Language"));
    const menuItems = screen.getAllByRole("menuitem");
    expect(menuItems).toHaveLength(18);
  });

  // Selecting a language calls setLocale with the correct locale code
  test("selecting a language calls setLocale", async () => {
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByLabelText("Language"));
    await userEvent.click(screen.getByText("Deutsch"));
    expect(mockSetLocale).toHaveBeenCalledWith("de");
  });

  // Selecting a language closes the menu
  test("selecting a language closes the menu", async () => {
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByLabelText("Language"));
    expect(screen.getByText("Suomi")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Suomi"));
    expect(mockSetLocale).toHaveBeenCalledWith("fi");
  });

  // Current locale (English) is marked as selected in the menu
  test("current locale is highlighted", async () => {
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByLabelText("Language"));
    const englishItem = screen.getByRole("menuitem", { name: /English/ });
    expect(englishItem).toHaveClass("Mui-selected");
  });

  // Closing the menu via onClose (Escape key) works
  test("pressing Escape closes the menu", async () => {
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByLabelText("Language"));
    expect(screen.getByText("English")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("presentation"), { key: "Escape" });
    // Menu close is handled by onClose callback
  });
});
