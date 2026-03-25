"use client";
import * as Sentry from "@sentry/nextjs";
import { ReactNode } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SentryErrorBoundary({ children, fallback }: Props) {
  return (
    <Sentry.ErrorBoundary
      fallback={
        fallback ?? (
          <Box p={4}>
            <Alert severity="error">
              <Typography variant="h6">Something went wrong</Typography>
              <Typography variant="body2">
                Our team has been notified. Please try refreshing.
              </Typography>
              <Button onClick={() => window.location.reload()} sx={{ mt: 1 }}>
                Refresh page
              </Button>
            </Alert>
          </Box>
        )
      }
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
