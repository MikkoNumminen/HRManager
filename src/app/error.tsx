"use client";

import { Box, Button, Typography } from "@mui/material";
import { colors } from "@/muiStyles";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        gap: 2,
        px: 2,
        textAlign: "center",
      }}
    >
      <Typography variant="h5" sx={{ color: colors.slate100 }}>
        Something went wrong
      </Typography>
      <Typography variant="body2" sx={{ color: colors.slate400 }}>
        {error.message || "An unexpected error occurred"}
      </Typography>
      <Button
        onClick={reset}
        sx={{
          color: colors.slate100,
          border: `1px solid ${colors.slate300}`,
          borderRadius: "4px",
          px: 3,
          mt: 1,
          "&:hover": { backgroundColor: colors.hoverOverlay },
        }}
      >
        Try again
      </Button>
    </Box>
  );
}
