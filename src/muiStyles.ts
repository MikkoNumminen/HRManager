export const smallButtonStyles = {
  border: "1px solid #CBD5E0",
  borderColor: "rgb(203 213 225)",
  color: "rgb(203 213 225)",
  px: 2,
  py: 1,
  borderRadius: "4px",
  "&:hover": {
    backgroundColor: "rgb(71 85 105)",
    borderColor: "rgb(203 213 225)",
    textDecoration: "none",
  },
  "&:focus-within": {
    backgroundColor: "rgb(71 85 105)",
    borderColor: "rgb(203 213 225)",
  },
  outline: "none",
};

export const largeButtonStyles = {
  borderColor: "rgb(203 213 225)",
  color: "rgb(203 213 225)",
  px: 2,
  py: 1,
  borderRadius: "4px",
  "&:hover": {
    backgroundColor: "rgb(71 85 105)",
    borderColor: "rgb(203 213 225)",
  },
  "&:focus-within": {
    backgroundColor: "rgb(71 85 105)",
    borderColor: "rgb(203 213 225)",
  },
  outline: "none",
  width: "100%",
};

export const boxStyles = {
  flex: "1",
  padding: "20px",
  transition: "background-color 0.3s ease",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
};
