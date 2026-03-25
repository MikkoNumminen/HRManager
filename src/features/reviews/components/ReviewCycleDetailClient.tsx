"use client";

import { useTransition, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  colors,
  formStyles,
  headerStyles,
  pageContainerStyles,
  textFieldStyles,
  smallButtonStyles,
} from "@/muiStyles";
import { ReviewCycle, ReviewRequest, Person } from "@/schemas";
import {
  openReviewCycle,
  closeReviewCycle,
  addReviewRequest,
  removeReviewRequest,
  deleteReviewCycle,
} from "@/features/reviews/actions";
import { useSnackbar } from "@/components/shared/SnackbarProvider";
import { useFormAction } from "@/hooks/useFormAction";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface Props {
  cycle: ReviewCycle & { requests: ReviewRequest[] };
  persons: Person[];
  canManage: boolean;
}

const statusColors: Record<string, "default" | "success" | "error"> = {
  DRAFT: "default",
  OPEN: "success",
  CLOSED: "error",
};

const typeColors: Record<string, "default" | "primary" | "secondary" | "info"> = {
  SELF: "default",
  MANAGER: "primary",
  PEER: "secondary",
  DIRECT_REPORT: "info",
};

export default function ReviewCycleDetailClient({ cycle, persons, canManage }: Props) {
  const t = useTranslations("reviews");
  const tc = useTranslations("common");
  const tn = useTranslations("reviewNotifications");
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
  const [deleteCycleOpen, setDeleteCycleOpen] = useState(false);
  const [openCycleOpen, setOpenCycleOpen] = useState(false);
  const [closeCycleOpen, setCloseCycleOpen] = useState(false);

  const [addState, addAction, isAdding] = useFormAction(addReviewRequest, {
    successMessage: tn("requestAdded"),
  });

  const [removeState, removeAction, isRemoving] = useFormAction(removeReviewRequest, {
    successMessage: tn("requestRemoved"),
    onSuccess: () => setDeleteRequestId(null),
  });

  const handleOpenCycle = () => {
    setOpenCycleOpen(false);
    const fd = new FormData();
    fd.append("cycleId", cycle.id);
    startTransition(async () => {
      const result = await openReviewCycle(fd);
      if (result?.error) showSnackbar(result.error);
      else showSnackbar(tn("cycleOpened"));
    });
  };

  const handleCloseCycle = () => {
    setCloseCycleOpen(false);
    const fd = new FormData();
    fd.append("cycleId", cycle.id);
    startTransition(async () => {
      const result = await closeReviewCycle(fd);
      if (result?.error) showSnackbar(result.error);
      else showSnackbar(tn("cycleClosed"));
    });
  };

  const handleDeleteCycle = () => {
    setDeleteCycleOpen(false);
    const fd = new FormData();
    fd.append("cycleId", cycle.id);
    startTransition(async () => {
      const result = await deleteReviewCycle(fd);
      if (result?.error) showSnackbar(result.error);
      else {
        showSnackbar(tn("cycleDeleted"));
        router.push("/reviews");
      }
    });
  };

  return (
    <Box>
      <Box sx={{ ...headerStyles, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            label={t(`status${cycle.status as "DRAFT" | "OPEN" | "CLOSED"}`)}
            color={statusColors[cycle.status]}
          />
          {cycle.templateName && (
            <Typography variant="body2" sx={{ color: colors.slate400 }}>
              {cycle.templateName}
            </Typography>
          )}
        </Box>
        {canManage && (
          <Box sx={{ display: "flex", gap: 1 }}>
            {cycle.status === "DRAFT" && (
              <Button sx={smallButtonStyles} onClick={() => setOpenCycleOpen(true)}>
                {t("openCycle")}
              </Button>
            )}
            {cycle.status === "OPEN" && (
              <Button
                sx={{ ...smallButtonStyles, color: colors.warning }}
                onClick={() => setCloseCycleOpen(true)}
              >
                {t("closeCycle")}
              </Button>
            )}
            <Button
              sx={{ ...smallButtonStyles, color: colors.error }}
              onClick={() => setDeleteCycleOpen(true)}
            >
              {t("deleteCycle")}
            </Button>
          </Box>
        )}
      </Box>

      {canManage && cycle.status === "DRAFT" && (
        <Box sx={formStyles}>
          <Typography variant="h6" sx={{ color: colors.slate100 }}>
            {t("addRequest")}
          </Typography>
          <Box
            component="form"
            action={addAction}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <input type="hidden" name="cycleId" value={cycle.id} />
            <FormControl sx={textFieldStyles}>
              <InputLabel shrink>{t("subject")}</InputLabel>
              <Select
                name="subjectId"
                label={t("subject")}
                inputProps={{ "aria-label": t("subject") }}
                defaultValue=""
              >
                {persons.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={textFieldStyles}>
              <InputLabel shrink>{t("reviewer")}</InputLabel>
              <Select
                name="reviewerId"
                label={t("reviewer")}
                inputProps={{ "aria-label": t("reviewer") }}
                defaultValue=""
              >
                {persons.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={textFieldStyles}>
              <InputLabel shrink>{t("reviewType")}</InputLabel>
              <Select
                name="type"
                label={t("reviewType")}
                inputProps={{ "aria-label": t("reviewType") }}
                defaultValue="PEER"
              >
                <MenuItem value="SELF">{t("typeSelf")}</MenuItem>
                <MenuItem value="MANAGER">{t("typeManager")}</MenuItem>
                <MenuItem value="PEER">{t("typePeer")}</MenuItem>
                <MenuItem value="DIRECT_REPORT">{t("typeDirectReport")}</MenuItem>
              </Select>
            </FormControl>
            {addState.error && (
              <Typography color="error" role="alert" variant="body2">
                {addState.error}
              </Typography>
            )}
            <Button
              type="submit"
              disabled={isAdding}
              startIcon={<PersonAddIcon />}
              sx={smallButtonStyles}
            >
              {t("addRequest")}
            </Button>
          </Box>
        </Box>
      )}

      <Box sx={pageContainerStyles}>
        <Typography variant="h6" sx={{ color: colors.slate100, mb: 2 }}>
          {t("requests")} ({cycle.requests.length})
        </Typography>
        {removeState.error && (
          <Typography color="error" role="alert" variant="body2" sx={{ mb: 1 }}>
            {removeState.error}
          </Typography>
        )}
        {cycle.requests.length === 0 ? (
          <Typography sx={{ color: colors.slate400 }}>{t("noRequests")}</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: colors.slate400 }}>{t("subject")}</TableCell>
                  <TableCell sx={{ color: colors.slate400 }}>{t("reviewer")}</TableCell>
                  <TableCell sx={{ color: colors.slate400 }}>{t("reviewType")}</TableCell>
                  <TableCell sx={{ color: colors.slate400 }}>Status</TableCell>
                  {canManage && cycle.status === "DRAFT" && (
                    <TableCell sx={{ color: colors.slate400 }} align="right">
                      {t("actions")}
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {cycle.requests.map((req) => (
                  <TableRow
                    key={req.id}
                    hover
                    sx={{ "&:hover": { backgroundColor: colors.rowHover } }}
                  >
                    <TableCell sx={{ color: colors.slate100 }}>
                      {req.subjectName ?? tc("unknown")}
                    </TableCell>
                    <TableCell sx={{ color: colors.slate100 }}>
                      {req.reviewerName ?? tc("unknown")}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t(
                          `type${req.type as "SELF" | "MANAGER" | "PEER" | "DIRECT_REPORT"}`,
                        )}
                        size="small"
                        color={typeColors[req.type]}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={req.status}
                        size="small"
                        color={req.status === "SUBMITTED" ? "success" : "default"}
                      />
                    </TableCell>
                    {canManage && cycle.status === "DRAFT" && (
                      <TableCell align="right">
                        <IconButton
                          aria-label={t("removeRequest")}
                          size="small"
                          onClick={() => setDeleteRequestId(req.id)}
                          disabled={isRemoving}
                          sx={{ color: colors.error }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <ConfirmDialog
        open={!!deleteRequestId}
        title={t("removeRequest")}
        message={t("removeRequestConfirm")}
        confirmLabel={tc("remove")}
        onConfirm={() => {
          if (!deleteRequestId) return;
          const fd = new FormData();
          fd.append("requestId", deleteRequestId);
          fd.append("cycleId", cycle.id);
          startTransition(() => removeAction(fd));
        }}
        onCancel={() => setDeleteRequestId(null)}
      />

      <ConfirmDialog
        open={deleteCycleOpen}
        title={t("deleteCycle")}
        message={t("deleteCycleConfirm")}
        confirmLabel={tc("remove")}
        onConfirm={handleDeleteCycle}
        onCancel={() => setDeleteCycleOpen(false)}
      />

      <ConfirmDialog
        open={openCycleOpen}
        title={t("openCycle")}
        message={t("openCycleConfirm")}
        confirmLabel={t("openCycle")}
        onConfirm={handleOpenCycle}
        onCancel={() => setOpenCycleOpen(false)}
      />

      <ConfirmDialog
        open={closeCycleOpen}
        title={t("closeCycle")}
        message={t("closeCycleConfirm")}
        confirmLabel={t("closeCycle")}
        onConfirm={handleCloseCycle}
        onCancel={() => setCloseCycleOpen(false)}
      />
    </Box>
  );
}
