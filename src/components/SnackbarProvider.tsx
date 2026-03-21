"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { colors } from "@/muiStyles";

type Severity = "success" | "error" | "info" | "warning";

interface SnackbarContextValue {
  showSnackbar: (message: string, severity?: Severity) => void;
}

const SnackbarContext = createContext<SnackbarContextValue>({
  showSnackbar: () => {},
});

export function useSnackbar() {
  return useContext(SnackbarContext);
}

export default function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("success");

  const showSnackbar = useCallback((msg: string, sev: Severity = "success") => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const handleClose = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setOpen(false);
  }, []);

  const contextValue = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  return (
    <SnackbarContext.Provider value={contextValue}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          sx={{
            width: "100%",
            fontWeight: 500,
            ...(severity === "success" && {
              backgroundColor: colors.green900,
              color: colors.green400,
              border: `1px solid ${colors.green400}`,
            }),
            ...(severity === "error" && {
              backgroundColor: colors.errorBg,
              color: colors.error,
              border: `1px solid ${colors.error}`,
            }),
            "& .MuiAlert-icon": {
              color: "inherit",
            },
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
