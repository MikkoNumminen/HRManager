const colors = {
  slate300: "rgb(203 213 225)",
  slate600: "rgb(71 85 105)",
  green400: "rgb(74 222 128)",
  green900: "rgb(20 83 45)",
};

export const smallButtonStyles = {
  border: "1px solid #CBD5E0",
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

export const boxStyles = {
  flex: "1",
  padding: "20px",
  transition: "background-color 0.3s ease",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
};
