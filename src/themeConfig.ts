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
    slate100: "#F1F5F9",
    slate300: "#CBD5E1",
    slate400: "#94A3B8",
    slate600: "#1E293B",
    slate700: "#0F172A",
    green400: "#4ADE80",
    green900: "#14532D",
    rowHover: "#172033",
    hoverOverlay: "rgba(255, 255, 255, 0.06)",
    error: "#F87171",
    errorBg: "rgba(248, 113, 113, 0.1)",
    warning: "#FBBF24",
    info: "#60A5FA",
    success: "#4ADE80",
  },
  light: {
    slate100: "#1E293B",
    slate300: "#64748B",
    slate400: "#94A3B8",
    slate600: "#FFFFFF",
    slate700: "#F8FAFC",
    green400: "#6366F1",
    green900: "#EEF2FF",
    rowHover: "#F1F5F9",
    hoverOverlay: "rgba(99, 102, 241, 0.06)",
    error: "#DC2626",
    errorBg: "rgba(220, 38, 38, 0.06)",
    warning: "#D97706",
    info: "#3B82F6",
    success: "#059669",
  },
  cyberpunk: {
    slate100: "#ECFEFF",
    slate300: "#A5F3FC",
    slate400: "#67E8F9",
    slate600: "#1A0B2E",
    slate700: "#0D0520",
    green400: "#EC4899",
    green900: "#500A32",
    rowHover: "#150826",
    hoverOverlay: "rgba(236, 72, 153, 0.15)",
    error: "#FB7185",
    errorBg: "rgba(251, 113, 133, 0.15)",
    warning: "#FBBF24",
    info: "#22D3EE",
    success: "#2DD4BF",
  },
  retro: {
    slate100: "#4ADE80",
    slate300: "#22C55E",
    slate400: "#16A34A",
    slate600: "#0A0F0A",
    slate700: "#000000",
    green400: "#4ADE80",
    green900: "#05280A",
    rowHover: "#0A1A0A",
    hoverOverlay: "rgba(74, 222, 128, 0.12)",
    error: "#EF4444",
    errorBg: "rgba(239, 68, 68, 0.15)",
    warning: "#FBBF24",
    info: "#4ADE80",
    success: "#86EFAC",
  },
  bubblegum: {
    slate100: "#F5E0DC",
    slate300: "#F2CDCD",
    slate400: "#9399B2",
    slate600: "#302D41",
    slate700: "#1E1E2E",
    green400: "#F5C2E7",
    green900: "#3B2748",
    rowHover: "#2A2740",
    hoverOverlay: "rgba(245, 194, 231, 0.10)",
    error: "#F38BA8",
    errorBg: "rgba(243, 139, 168, 0.12)",
    warning: "#FAB387",
    info: "#CBA6F7",
    success: "#A6E3A1",
  },
  ocean: {
    slate100: "#E0F2FE",
    slate300: "#7DD3FC",
    slate400: "#38BDF8",
    slate600: "#0C2D48",
    slate700: "#071A2E",
    green400: "#22D3EE",
    green900: "#0E3A4F",
    rowHover: "#0A2540",
    hoverOverlay: "rgba(34, 211, 238, 0.10)",
    error: "#FB7185",
    errorBg: "rgba(251, 113, 133, 0.10)",
    warning: "#FBBF24",
    info: "#38BDF8",
    success: "#2DD4BF",
  },
};
