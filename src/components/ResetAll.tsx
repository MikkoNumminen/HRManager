"use client";

import { resetAll, seedMockData } from "@/serverActions";
import { colors, formStyles, headerStyles, smallButtonStyles } from "@/muiStyles";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useRef, useState, useTransition } from "react";
import ConfirmDialog from "./ConfirmDialog";

export default function ResetAll() {
  const formRef = useRef<HTMLFormElement>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSeed = (clearExisting: boolean) => {
    setSeedDialogOpen(false);
    setError(null);
    startTransition(async () => {
      try {
        await seedMockData(clearExisting);
      } catch (e) {
        setError(e instanceof Error ? e.message : "An error occurred");
      }
    });
  };

  return (
    <Box sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h5">Developer Tools</Typography>
      </Box>
      {error && <Typography color="error">{error}</Typography>}
      <Box display="flex" gap={1} justifyContent="flex-end">
        <Button disabled={isPending} onClick={() => setSeedDialogOpen(true)} sx={smallButtonStyles}>
          Load Mock Data
        </Button>
        <Button
          disabled={isPending}
          onClick={() => setResetDialogOpen(true)}
          sx={{
            ...smallButtonStyles,
            borderColor: "#f87171",
            color: "#f87171",
            "&:hover": {
              backgroundColor: "rgba(248, 113, 113, 0.1)",
              borderColor: "#f87171",
            },
          }}
        >
          Reset All Data
        </Button>
      </Box>
      <Box
        component="form"
        action={async () => {
          try {
            await resetAll();
            setError(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : "An error occurred");
          }
        }}
        ref={formRef}
        sx={{ display: "none" }}
      />
      <ConfirmDialog
        open={resetDialogOpen}
        title="Reset All Data"
        message="Are you sure you want to delete all persons and teams? This action cannot be undone."
        confirmLabel="Reset All"
        onConfirm={() => {
          setResetDialogOpen(false);
          formRef.current?.requestSubmit();
        }}
        onCancel={() => setResetDialogOpen(false)}
      />
      <Dialog
        open={seedDialogOpen}
        onClose={() => setSeedDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: colors.slate700,
              border: `1px solid ${colors.slate300}`,
              borderRadius: "8px",
            },
          },
        }}
      >
        <DialogTitle sx={{ color: colors.slate100 }}>Load Mock Data</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: colors.slate400 }}>
            Do you want to keep your existing data or replace it with mock data?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSeedDialogOpen(false)} sx={{ color: colors.slate300 }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleSeed(false)}
            sx={{
              color: colors.slate100,
              "&:hover": { backgroundColor: colors.hoverOverlay },
            }}
          >
            Keep Existing
          </Button>
          <Button
            onClick={() => handleSeed(true)}
            sx={{
              color: "#f87171",
              "&:hover": { backgroundColor: "rgba(248, 113, 113, 0.1)" },
            }}
          >
            Replace All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
