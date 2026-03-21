"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider, createTheme, CssBaseline, GlobalStyles } from "@mui/material";
import { colors } from "@/muiStyles";
import {
  ThemeName,
  THEME_NAMES,
  THEME_PALETTES,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
} from "@/themeConfig";

interface ThemeContextValue {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  currentTheme: DEFAULT_THEME,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function loadTheme(): ThemeName {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && (THEME_NAMES as readonly string[]).includes(stored)) {
      return stored as ThemeName;
    }
  } catch {
    /* empty */
  }
  return DEFAULT_THEME;
}

function getPaletteMode(theme: ThemeName): "dark" | "light" {
  return theme === "light" || theme === "bubblegum" ? "light" : "dark";
}

function buildCssVariables(theme: ThemeName): Record<string, string> {
  const palette = THEME_PALETTES[theme];
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(palette)) {
    vars[`--hrm-${key}`] = value;
  }
  return vars;
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    setCurrentTheme(loadTheme());
  }, []);

  const setTheme = useCallback((theme: ThemeName) => {
    setCurrentTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* empty */
    }
  }, []);

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: getPaletteMode(currentTheme),
          background: {
            default: colors.slate700,
            paper: colors.slate600,
          },
          text: {
            primary: colors.slate100,
            secondary: colors.slate300,
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: colors.slate700,
                color: colors.slate100,
              },
            },
          },
        },
      }),
    [currentTheme],
  );

  const globalStyles = useMemo(
    () => ({ ":root": buildCssVariables(currentTheme) }),
    [currentTheme],
  );

  const contextValue = useMemo(() => ({ currentTheme, setTheme }), [currentTheme, setTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <GlobalStyles styles={globalStyles} />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
