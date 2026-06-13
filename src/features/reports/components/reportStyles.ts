import { colors } from "@/muiStyles";

export const chartBoxStyles = {
  border: `1px solid ${colors.slate300}`,
  borderRadius: "4px",
  padding: { xs: "16px", sm: "20px" },
};

export const chartTextStyles = {
  style: {
    fill: "var(--hrm-slate300)",
    fontSize: 12,
  },
};

export const tableCellStyles = {
  color: colors.slate300,
  borderBottom: `1px solid ${colors.hoverOverlay}`,
};

export const tableHeaderStyles = {
  ...tableCellStyles,
  color: colors.slate100,
  fontWeight: 600,
};

export const CHART_COLORS = [
  "var(--hrm-info)",
  "var(--hrm-success)",
  "var(--hrm-warning)",
  "#ab47bc",
  "#ef5350",
  "#26c6da",
  "#ff7043",
  "#66bb6a",
];

// The subset of next-intl's `useTranslations()` translator that the report tabs
// use: look up a key with optional ICU values. (Was `any`.)
export type TranslationFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;
