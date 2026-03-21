export const colors = {
  slate100: "var(--hrm-slate100)",
  slate300: "var(--hrm-slate300)",
  slate400: "var(--hrm-slate400)",
  slate600: "var(--hrm-slate600)",
  slate700: "var(--hrm-slate700)",
  green400: "var(--hrm-green400)",
  green900: "var(--hrm-green900)",
  rowHover: "var(--hrm-rowHover)",
  hoverOverlay: "var(--hrm-hoverOverlay)",
  error: "var(--hrm-error)",
  errorBg: "var(--hrm-errorBg)",
  warning: "var(--hrm-warning)",
  info: "var(--hrm-info)",
  success: "var(--hrm-success)",
};

export const formStyles = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 2,
  border: `1px solid ${colors.slate300}`,
  borderRadius: "4px",
  p: { xs: 1.5, sm: 2 },
  mb: 1.5,
};

export const headerStyles = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  mb: 2,
};

export const textFieldStyles = {
  "& .MuiOutlinedInput-root": {
    color: colors.slate300,
    "& fieldset": { borderColor: colors.slate300 },
    "&:hover fieldset": { borderColor: colors.slate100 },
    "&.Mui-focused fieldset": { borderColor: colors.slate100 },
  },
  "& .MuiInputLabel-root": { color: colors.slate400 },
  "& .MuiInputLabel-root.Mui-focused": { color: colors.slate100 },
};

export const radioStyles = {
  color: colors.slate300,
  "&.Mui-checked": { color: colors.slate300 },
  p: "2px 8px",
};

export const smallButtonStyles = {
  border: `1px solid ${colors.slate300}`,
  borderColor: colors.slate300,
  color: colors.slate300,
  px: 2,
  py: 1,
  borderRadius: "4px",
  "&:hover": {
    backgroundColor: colors.slate600,
    borderColor: colors.slate300,
    textDecoration: "none",
  },
  "&:focus-within": {
    backgroundColor: colors.slate600,
    borderColor: colors.slate300,
  },
  "&.Mui-disabled": {
    opacity: 0.25,
    borderColor: colors.slate300,
    color: colors.slate300,
    cursor: "not-allowed",
    pointerEvents: "auto",
  },
  outline: "none",
};

export const largeButtonStyles = {
  borderColor: colors.slate300,
  color: colors.slate300,
  px: 2,
  py: 1,
  borderRadius: "4px",
  "&:hover": {
    backgroundColor: colors.slate600,
    borderColor: colors.slate300,
  },
  "&:focus-within": {
    backgroundColor: colors.slate600,
    borderColor: colors.slate300,
  },
  outline: "none",
  width: "100%",
};

export const activeButtonStyles = {
  borderColor: colors.green400,
  color: colors.green400,
  "&:hover": {
    backgroundColor: colors.green900,
    borderColor: colors.green400,
    textDecoration: "none",
  },
};

export const avatarStyles = {
  width: { xs: 36, sm: 32 },
  height: { xs: 36, sm: 32 },
  border: `1px solid ${colors.slate300}`,
  fontSize: "0.875rem",
};

export const userMenuStyles = {
  "& .MuiPaper-root": {
    backgroundColor: colors.slate600,
    border: `1px solid ${colors.slate300}`,
    borderRadius: "4px",
    minWidth: { xs: "70vw", sm: 200 },
    maxWidth: { xs: "90vw", sm: "none" },
  },
};

export const userMenuItemStyles = {
  color: colors.slate100,
  "&:hover": {
    backgroundColor: colors.hoverOverlay,
  },
};

export const tableStyles = {
  minWidth: { xs: 500, sm: 650 },
  width: "100%",
};

export const boxStyles = {
  flex: "1",
  padding: { xs: "16px", sm: "20px" },
  border: `1px solid ${colors.slate300}`,
  borderRadius: "4px",
  mb: 1.5,
  transition: "background-color 0.3s ease",
  "&:hover": {
    backgroundColor: colors.hoverOverlay,
  },
};
