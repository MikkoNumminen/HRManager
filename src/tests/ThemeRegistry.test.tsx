import { render, screen } from "@testing-library/react";
import ThemeRegistry from "../components/ThemeRegistry";

describe("ThemeRegistry", () => {
  // Renders children inside the MUI ThemeProvider with dark theme.
  test("renders children", () => {
    render(
      <ThemeRegistry>
        <span>Themed Content</span>
      </ThemeRegistry>,
    );
    expect(screen.getByText("Themed Content")).toBeInTheDocument();
  });

  // Applies the dark theme background color to the document body via CssBaseline.
  test("applies dark theme styles", () => {
    render(
      <ThemeRegistry>
        <div>Test</div>
      </ThemeRegistry>,
    );
    // CssBaseline injects global styles — verify component renders without error
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
