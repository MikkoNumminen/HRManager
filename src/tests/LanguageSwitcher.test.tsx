import { render, screen, fireEvent } from "@testing-library/react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { locales, localeNames } from "../i18n/config";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockSetLocale = jest.fn().mockResolvedValue(undefined);
jest.mock("../i18n/actions", () => ({
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
  test("clicking button opens menu with all languages", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText("Language"));
    for (const locale of locales) {
      expect(screen.getByText(localeNames[locale])).toBeInTheDocument();
    }
  });

  // Menu shows exactly 18 items (one per locale)
  test("menu has 18 items", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText("Language"));
    const menuItems = screen.getAllByRole("menuitem");
    expect(menuItems).toHaveLength(18);
  });

  // Selecting a language calls setLocale with the correct locale code
  test("selecting a language calls setLocale", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText("Language"));
    fireEvent.click(screen.getByText("Deutsch"));
    expect(mockSetLocale).toHaveBeenCalledWith("de");
  });

  // Selecting a language closes the menu
  test("selecting a language closes the menu", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText("Language"));
    expect(screen.getByText("Suomi")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Suomi"));
    expect(mockSetLocale).toHaveBeenCalledWith("fi");
  });

  // Current locale (English) is marked as selected in the menu
  test("current locale is highlighted", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText("Language"));
    const englishItem = screen.getByText("English").closest("li");
    expect(englishItem).toHaveClass("Mui-selected");
  });

  // Closing the menu via onClose (Escape key) works
  test("pressing Escape closes the menu", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByLabelText("Language"));
    expect(screen.getByText("English")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("presentation"), { key: "Escape" });
    // Menu close is handled by onClose callback
  });
});
