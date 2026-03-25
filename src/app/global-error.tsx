"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button, Box, Typography, Alert } from "@mui/material";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          sx={{ bgcolor: "#121212" }}
        >
          <Alert severity="error" sx={{ maxWidth: 500 }}>
            <Typography variant="h6">Application Error</Typography>
            <Typography variant="body2" mb={2}>
              An unexpected error occurred. The team has been notified.
            </Typography>
            <Button variant="outlined" onClick={reset}>
              Try again
            </Button>
          </Alert>
        </Box>
      </body>
    </html>
  );
}
