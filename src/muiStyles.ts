export const colors = {
  slate100: "rgb(241 245 249)",
  slate300: "rgb(203 213 225)",
  slate400: "rgb(148 163 184)",
  slate600: "rgb(71 85 105)",
  slate700: "rgb(51 65 85)",
  green400: "rgb(74 222 128)",
  green900: "rgb(20 83 45)",
  rowHover: "#f0f0f0",
  hoverOverlay: "rgba(255, 255, 255, 0.04)",
};

export const formStyles = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 2,
  border: `1px solid ${colors.slate300}`,
  borderRadius: "4px",
  p: 2,
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
  width: 32,
  height: 32,
  border: `1px solid ${colors.slate300}`,
  fontSize: "0.875rem",
};

export const userMenuStyles = {
  "& .MuiPaper-root": {
    backgroundColor: colors.slate600,
    border: `1px solid ${colors.slate300}`,
    borderRadius: "4px",
    minWidth: 200,
  },
};

export const userMenuItemStyles = {
  color: colors.slate100,
  "&:hover": {
    backgroundColor: colors.hoverOverlay,
  },
};

export const boxStyles = {
  flex: "1",
  padding: "20px",
  border: `1px solid ${colors.slate300}`,
  borderRadius: "4px",
  mb: 1.5,
  transition: "background-color 0.3s ease",
  "&:hover": {
    backgroundColor: colors.hoverOverlay,
  },
};
