"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useActionState, useCallback, useState } from "react";
import { colors, dialogPaperSx } from "@/muiStyles";
import { parseCSV, validatePersonImportRows } from "@/csvUtils";
import { importPersonsCsv, ImportResult } from "@/serverActions";
import { MAX_IMPORT_FILE_SIZE, MAX_IMPORT_ROWS } from "@/schemas";
import { useSnackbar } from "./SnackbarProvider";
import { useTranslations } from "next-intl";

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface PreviewData {
  headers: string[];
  rows: string[][];
  validCount: number;
  errorCount: number;
  errors: { row: number; field: string; message: string }[];
  file: File;
}

export default function CsvImportDialog({ open, onClose }: CsvImportDialogProps) {
  const t = useTranslations("dataIO");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    async (prevState: { error?: string; result?: ImportResult } | null, formData: FormData) => {
      const result = await importPersonsCsv(prevState, formData);
      if (result.result && result.result.imported > 0) {
        showSnackbar(tn("dataImported", { count: result.result.imported }));
      }
      return result;
    },
    null,
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      setClientError(null);
      setPreview(null);

      if (!file.name.endsWith(".csv")) {
        setClientError(t("errorNotCsv"));
        return;
      }
      if (file.size > MAX_IMPORT_FILE_SIZE) {
        setClientError(t("errorTooLarge"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);

        if (parsed.length <= 1) {
          setClientError(t("errorEmptyFile"));
          return;
        }
        if (parsed.length - 1 > MAX_IMPORT_ROWS) {
          setClientError(t("errorTooManyRows", { max: MAX_IMPORT_ROWS }));
          return;
        }

        // Client-side validation (without DB emails — server handles dedup)
        const { valid, errors } = validatePersonImportRows(parsed, new Set());

        setPreview({
          headers: parsed[0],
          rows: parsed.slice(1, 6), // Show first 5 data rows
          validCount: valid.length,
          errorCount: errors.length,
          errors,
          file,
        });
      };
      reader.readAsText(file);
    },
    [t],
  );

  const handleClose = () => {
    setPreview(null);
    setClientError(null);
    onClose();
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const importDone = state?.result && !state.error;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="import-dialog-title"
      slotProps={{
        paper: {
          sx: dialogPaperSx,
        },
      }}
    >
      <DialogTitle id="import-dialog-title" sx={{ color: colors.slate100 }}>
        {t("importDialogTitle")}
      </DialogTitle>
      <DialogContent>
        {/* Success result */}
        {importDone && state.result && (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: colors.success, mb: 1 }} />
            <Typography sx={{ color: colors.slate100, mb: 1 }}>{t("importSuccess")}</Typography>
            <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
              <Chip
                label={t("importedCount", { count: state.result.imported })}
                sx={{ color: colors.success, borderColor: colors.success }}
                variant="outlined"
                size="small"
              />
              {state.result.skipped > 0 && (
                <Chip
                  label={t("skippedCount", { count: state.result.skipped })}
                  sx={{ color: colors.warning, borderColor: colors.warning }}
                  variant="outlined"
                  size="small"
                />
              )}
              {state.result.errors.length > 0 && (
                <Chip
                  label={t("errorCount", { count: state.result.errors.length })}
                  sx={{ color: colors.error, borderColor: colors.error }}
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
          </Box>
        )}

        {/* File drop zone / picker */}
        {!importDone && !preview && (
          <Box
            data-testid="csv-drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            sx={{
              border: `2px dashed ${colors.slate300}`,
              borderRadius: "8px",
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              "&:hover": { borderColor: colors.slate100 },
            }}
            onClick={() => document.getElementById("csv-file-input")?.click()}
          >
            <UploadFileIcon sx={{ fontSize: 48, color: colors.slate400, mb: 1 }} />
            <Typography sx={{ color: colors.slate100 }}>{t("dropZoneText")}</Typography>
            <Typography variant="body2" sx={{ color: colors.slate400 }}>
              {t("dropZoneSubtext")}
            </Typography>
            <input
              id="csv-file-input"
              data-testid="csv-file-input"
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </Box>
        )}

        {/* Client error */}
        {clientError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {clientError}
          </Alert>
        )}

        {/* Server error */}
        {state?.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {state.error}
          </Alert>
        )}

        {/* Preview */}
        {!importDone && preview && (
          <>
            <Typography variant="body2" sx={{ color: colors.slate400, mb: 1 }}>
              {t("previewFile", { name: preview.file.name })}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <Chip
                label={t("validRows", { count: preview.validCount })}
                sx={{ color: colors.success, borderColor: colors.success }}
                variant="outlined"
                size="small"
              />
              {preview.errorCount > 0 && (
                <Chip
                  label={t("errorRows", { count: preview.errorCount })}
                  sx={{ color: colors.error, borderColor: colors.error }}
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {preview.headers.map((h, i) => (
                      <TableCell key={i} sx={{ color: colors.slate100, fontWeight: 600 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.rows.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => (
                        <TableCell key={j} sx={{ color: colors.slate300 }}>
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Validation errors */}
            {preview.errors.length > 0 && (
              <Box sx={{ maxHeight: 150, overflow: "auto", mb: 1 }}>
                {preview.errors.slice(0, 20).map((err, i) => (
                  <Typography key={i} variant="body2" sx={{ color: colors.error }}>
                    {t("rowError", { row: err.row, field: err.field, message: err.message })}
                  </Typography>
                ))}
                {preview.errors.length > 20 && (
                  <Typography variant="body2" sx={{ color: colors.slate400 }}>
                    {t("moreErrors", { count: preview.errors.length - 20 })}
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} sx={{ color: colors.slate300 }}>
          {importDone ? t("close") : t("cancel")}
        </Button>
        {!importDone && preview && preview.validCount > 0 && (
          <Box component="form" action={formAction}>
            <input type="hidden" name="file" />
            <Button
              type="submit"
              disabled={isPending}
              variant="contained"
              startIcon={isPending ? undefined : <UploadFileIcon />}
              onClick={(e) => {
                // Attach the file to FormData before submission
                e.preventDefault();
                const formData = new FormData();
                formData.append("file", preview.file);
                formAction(formData);
              }}
              sx={{
                backgroundColor: colors.info,
                "&:hover": { backgroundColor: colors.info, opacity: 0.9 },
              }}
            >
              {isPending ? t("importing") : t("importCount", { count: preview.validCount })}
            </Button>
          </Box>
        )}
      </DialogActions>
    </Dialog>
  );
}
