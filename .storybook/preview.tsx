import type { Preview } from "@storybook/react";
import React from "react";
import { ThemeProvider, createTheme, CssBaseline, GlobalStyles } from "@mui/material";
import { THEME_PALETTES } from "../src/themeConfig";

/**
 * Builds CSS variable overrides for the dark HRM theme.
 * The app normally sets these via ThemeRegistry → GlobalStyles → :root.
 * In Storybook we inject them directly into the decorator so colors render correctly.
 */
function buildCssVariables(palette: (typeof THEME_PALETTES)["dark"]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(palette)) {
    vars[`--hrm-${key}`] = value;
  }
  return vars;
}

const darkPalette = THEME_PALETTES["dark"];

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: darkPalette.slate700,
      paper: darkPalette.slate600,
    },
    text: {
      primary: darkPalette.slate100,
      secondary: darkPalette.slate300,
    },
  },
});

const cssVars = buildCssVariables(darkPalette);

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: darkPalette.slate700 },
        { name: "light", value: "#ffffff" },
      ],
    },
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <GlobalStyles styles={{ ":root": cssVars }} />
        <div style={{ padding: "24px", minHeight: "100vh" }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default preview;
