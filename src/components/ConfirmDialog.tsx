"use client";

import { colors } from "@/muiStyles";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
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
      <DialogTitle sx={{ color: colors.slate100 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: colors.slate400 }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} sx={{ color: colors.slate300 }}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          sx={{
            color: colors.error,
            "&:hover": { backgroundColor: colors.errorBg },
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
