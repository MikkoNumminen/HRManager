export const THEME_NAMES = ["dark", "light", "cyberpunk", "retro", "bubblegum", "ocean"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

export const THEME_STORAGE_KEY = "hrm-theme";
export const DEFAULT_THEME: ThemeName = "dark";

export interface ThemeColors {
  slate100: string;
  slate300: string;
  slate400: string;
  slate600: string;
  slate700: string;
  green400: string;
  green900: string;
  rowHover: string;
  hoverOverlay: string;
  error: string;
  errorBg: string;
  warning: string;
  info: string;
  success: string;
}

export const THEME_LABELS: Record<ThemeName, string> = {
  dark: "Dark",
  light: "Light",
  cyberpunk: "Cyberpunk",
  retro: "Retro Terminal",
  bubblegum: "Bubblegum",
  ocean: "Ocean",
};

export const THEME_ICONS: Record<ThemeName, string> = {
  dark: "\u{1F319}",
  light: "\u{2600}\u{FE0F}",
  cyberpunk: "\u{1F916}",
  retro: "\u{1F4DF}",
  bubblegum: "\u{1F36C}",
  ocean: "\u{1F30A}",
};

export const THEME_PALETTES: Record<ThemeName, ThemeColors> = {
  dark: {
    slate100: "rgb(241 245 249)",
    slate300: "rgb(203 213 225)",
    slate400: "rgb(148 163 184)",
    slate600: "rgb(71 85 105)",
    slate700: "rgb(51 65 85)",
    green400: "rgb(74 222 128)",
    green900: "rgb(20 83 45)",
    rowHover: "#1e293b",
    hoverOverlay: "rgba(255, 255, 255, 0.1)",
    error: "#f87171",
    errorBg: "rgba(248, 113, 113, 0.1)",
    warning: "#f59e0b",
    info: "#60a5fa",
    success: "#4ade80",
  },
  light: {
    slate100: "rgb(15 23 42)",
    slate300: "rgb(51 65 85)",
    slate400: "rgb(100 116 139)",
    slate600: "rgb(226 232 240)",
    slate700: "rgb(248 250 252)",
    green400: "rgb(22 163 74)",
    green900: "rgb(220 252 231)",
    rowHover: "#f1f5f9",
    hoverOverlay: "rgba(0, 0, 0, 0.08)",
    error: "#dc2626",
    errorBg: "rgba(220, 38, 38, 0.1)",
    warning: "#d97706",
    info: "#2563eb",
    success: "#16a34a",
  },
  cyberpunk: {
    slate100: "rgb(236 254 255)",
    slate300: "rgb(165 243 252)",
    slate400: "rgb(103 232 249)",
    slate600: "rgb(30 10 60)",
    slate700: "rgb(15 5 35)",
    green400: "rgb(236 72 153)",
    green900: "rgb(80 10 50)",
    rowHover: "#1a0a3e",
    hoverOverlay: "rgba(236, 72, 153, 0.15)",
    error: "#fb7185",
    errorBg: "rgba(251, 113, 133, 0.15)",
    warning: "#fbbf24",
    info: "#22d3ee",
    success: "#a78bfa",
  },
  retro: {
    slate100: "rgb(74 222 128)",
    slate300: "rgb(34 197 94)",
    slate400: "rgb(22 163 74)",
    slate600: "rgb(10 15 10)",
    slate700: "rgb(0 0 0)",
    green400: "rgb(74 222 128)",
    green900: "rgb(5 40 10)",
    rowHover: "#0a1a0a",
    hoverOverlay: "rgba(74, 222, 128, 0.12)",
    error: "#fbbf24",
    errorBg: "rgba(251, 191, 36, 0.15)",
    warning: "#fbbf24",
    info: "#4ade80",
    success: "#4ade80",
  },
  bubblegum: {
    slate100: "rgb(80 20 80)",
    slate300: "rgb(120 40 120)",
    slate400: "rgb(160 80 160)",
    slate600: "rgb(253 230 243)",
    slate700: "rgb(252 241 248)",
    green400: "rgb(219 39 119)",
    green900: "rgb(252 231 243)",
    rowHover: "#fce7f3",
    hoverOverlay: "rgba(219, 39, 119, 0.12)",
    error: "#e11d48",
    errorBg: "rgba(225, 29, 72, 0.1)",
    warning: "#f59e0b",
    info: "#a855f7",
    success: "#db2777",
  },
  ocean: {
    slate100: "rgb(224 242 254)",
    slate300: "rgb(147 197 253)",
    slate400: "rgb(96 165 250)",
    slate600: "rgb(15 33 55)",
    slate700: "rgb(8 20 40)",
    green400: "rgb(34 211 238)",
    green900: "rgb(8 60 80)",
    rowHover: "#0c2a4a",
    hoverOverlay: "rgba(34, 211, 238, 0.12)",
    error: "#fb7185",
    errorBg: "rgba(251, 113, 133, 0.12)",
    warning: "#fbbf24",
    info: "#38bdf8",
    success: "#2dd4bf",
  },
};
