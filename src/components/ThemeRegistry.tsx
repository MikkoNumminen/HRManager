"use client";

import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { colors } from "@/muiStyles";

const theme = createTheme({
  palette: {
    mode: "dark",
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
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
