"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Chip,
  TextField,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  LinearProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import GroupIcon from "@mui/icons-material/Group";
import {
  colors,
  formStyles,
  headerStyles,
  pageContainerStyles,
  textFieldStyles,
  smallButtonStyles,
} from "@/muiStyles";
import { ReviewCycle } from "@/schemas";
import { createReviewCycle } from "@/serverActions";
import { useSnackbar } from "./SnackbarProvider";
import { useTranslations } from "next-intl";

interface Props {
  cycles: ReviewCycle[];
  canManage: boolean;
  canSubmit: boolean;
  canView: boolean;
}

type FormState = { error: string | null };

const statusColors: Record<string, "default" | "success" | "error"> = {
  DRAFT: "default",
  OPEN: "success",
  CLOSED: "error",
};

export default function ReviewsClient({ cycles, canManage, canSubmit, canView }: Props) {
  const t = useTranslations("reviews");
  const tn = useTranslations("reviewNotifications");
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await createReviewCycle(formData);
      if (result?.error) return { error: result.error };
      showSnackbar(tn("cycleCreated"));
      return { error: null };
    },
    { error: null },
  );

  return (
    <Box>
      {canManage && (
        <Box sx={{ ...formStyles, mb: 2 }}>
          <Box sx={headerStyles}>
            <Typography variant="h6" sx={{ color: colors.slate100 }}>
              {t("createCycle")}
            </Typography>
            {canManage && (
              <Button component="a" href="/reviews/templates" sx={smallButtonStyles} size="small">
                {t("templates")}
              </Button>
            )}
          </Box>
          <Box
            component="form"
            action={formAction}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              name="name"
              label={t("enterCycleName")}
              required
              sx={textFieldStyles}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              name="startDate"
              label={t("startDate")}
              type="date"
              required
              sx={textFieldStyles}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              name="endDate"
              label={t("endDate")}
              type="date"
              required
              sx={textFieldStyles}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            {state.error && (
              <Typography color="error" role="alert" variant="body2">
                {state.error}
              </Typography>
            )}
            <Button
              type="submit"
              disabled={isPending}
              startIcon={<AddIcon />}
              sx={smallButtonStyles}
            >
              {t("createCycle")}
            </Button>
          </Box>
        </Box>
      )}

      <Box sx={pageContainerStyles}>
        <Box sx={headerStyles}>
          <Typography variant="h6" sx={{ color: colors.slate100 }}>
            {t("heading")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {canView && (
              <Button
                component="a"
                href="/reviews/team-reviews"
                startIcon={<GroupIcon />}
                sx={smallButtonStyles}
                size="small"
              >
                {t("teamReviewsTitle")}
              </Button>
            )}
            {canSubmit && (
              <Button
                component="a"
                href="/reviews/my-reviews"
                startIcon={<AssignmentIcon />}
                sx={smallButtonStyles}
                size="small"
              >
                {t("myReviews")}
              </Button>
            )}
          </Box>
        </Box>
        {cycles.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography sx={{ color: colors.slate400 }}>{t("noCycles")}</Typography>
            <Typography variant="body2" sx={{ color: colors.slate400, mt: 1 }}>
              {t("noCyclesHint")}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {cycles.map((cycle) => {
              const progress =
                cycle.requestCount > 0
                  ? Math.round((cycle.submittedCount / cycle.requestCount) * 100)
                  : 0;
              return (
                <Grid key={cycle.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    sx={{
                      backgroundColor: colors.slate700,
                      border: `1px solid ${colors.slate300}`,
                      borderRadius: "4px",
                    }}
                  >
                    <CardActionArea
                      onClick={() =>
                        startTransition(() => router.push(`/reviews/cycles/${cycle.id}`))
                      }
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{ color: colors.slate100, fontWeight: 600 }}
                          >
                            {cycle.name}
                          </Typography>
                          <Chip
                            label={t(`status${cycle.status as "DRAFT" | "OPEN" | "CLOSED"}`)}
                            size="small"
                            color={statusColors[cycle.status]}
                          />
                        </Box>
                        {cycle.templateName && (
                          <Typography variant="body2" sx={{ color: colors.slate400, mb: 1 }}>
                            {cycle.templateName}
                          </Typography>
                        )}
                        {cycle.requestCount > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{ color: colors.slate400 }}>
                              {t("progress", {
                                submitted: cycle.submittedCount,
                                total: cycle.requestCount,
                              })}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{ mt: 0.5, borderRadius: "2px" }}
                            />
                          </Box>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
