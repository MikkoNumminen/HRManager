"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Chip, Slider, TextField, Typography, Alert } from "@mui/material";
import {
  colors,
  formStyles,
  pageContainerStyles,
  textFieldStyles,
  smallButtonStyles,
} from "@/muiStyles";
import { ReviewRequest, ReviewTemplate } from "@/schemas";
import { submitReview } from "@/features/reviews/actions";
import { useFormAction } from "@/hooks/useFormAction";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useTranslations } from "next-intl";

interface Props {
  request: ReviewRequest;
  template: ReviewTemplate | null;
}

type Answer = { questionId: string; ratingValue: number | null; textValue: string | null };

export default function ReviewSubmitClient({ request, template }: Props) {
  const t = useTranslations("reviews");
  const tn = useTranslations("reviewNotifications");
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>(
    template?.questions.map((q) => ({
      questionId: q.id,
      ratingValue: q.type === "RATING" ? (q.scaleMin ?? 1) : null,
      textValue: null,
    })) ?? [],
  );

  const [state, formAction, isPending] = useFormAction(
    async (formData) => {
      formData.set("answers", JSON.stringify(answers));
      return submitReview(formData);
    },
    {
      successMessage: tn("reviewSubmitted"),
      onSuccess: () => router.push("/reviews/my-reviews"),
    },
  );

  const updateRating = (questionId: string, value: number) => {
    setAnswers((prev) =>
      prev.map((a) => (a.questionId === questionId ? { ...a, ratingValue: value } : a)),
    );
  };

  const updateText = (questionId: string, value: string) => {
    setAnswers((prev) =>
      prev.map((a) => (a.questionId === questionId ? { ...a, textValue: value } : a)),
    );
  };

  const reviewTypeKey = `reviewType_${request.type}` as
    | "reviewType_SELF"
    | "reviewType_MANAGER"
    | "reviewType_PEER"
    | "reviewType_DIRECT_REPORT";

  if (request.status === "SUBMITTED") {
    return (
      <Box sx={pageContainerStyles}>
        <Alert severity="info">{t("alreadySubmitted")}</Alert>
      </Box>
    );
  }

  if (request.cycleStatus !== "OPEN") {
    return (
      <Box sx={pageContainerStyles}>
        <Alert severity="warning">{t("cycleNotOpen")}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", gap: 1, alignItems: "center" }}>
        <Chip label={t(reviewTypeKey)} color="primary" />
        <Typography sx={{ color: colors.slate400 }}>
          {t("reviewFor", { name: request.subjectName ?? "" })}
        </Typography>
      </Box>

      <Box
        component="form"
        action={formAction}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <input type="hidden" name="requestId" value={request.id} />

        {template && template.questions.length > 0 ? (
          template.questions
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((q, idx) => {
              const answer = answers.find((a) => a.questionId === q.id);
              return (
                <Box key={q.id} sx={formStyles}>
                  <Typography sx={{ color: colors.slate100 }}>
                    {idx + 1}. {q.text}
                    {q.required && (
                      <Typography component="span" sx={{ color: colors.error, ml: 0.5 }}>
                        *
                      </Typography>
                    )}
                  </Typography>
                  {q.type === "RATING" ? (
                    <Box sx={{ px: 1 }}>
                      <Typography variant="body2" sx={{ color: colors.slate400, mb: 1 }}>
                        {t("ratingLabel", { min: q.scaleMin ?? 1, max: q.scaleMax ?? 5 })}:{" "}
                        <strong style={{ color: colors.slate100 }}>
                          {answer?.ratingValue ?? q.scaleMin ?? 1}
                        </strong>
                      </Typography>
                      <Slider
                        aria-label={q.text}
                        value={answer?.ratingValue ?? q.scaleMin ?? 1}
                        min={q.scaleMin ?? 1}
                        max={q.scaleMax ?? 5}
                        step={1}
                        marks
                        onChange={(_, val) => updateRating(q.id, val as number)}
                        sx={{ color: colors.slate300 }}
                      />
                    </Box>
                  ) : (
                    <TextField
                      multiline
                      minRows={3}
                      placeholder={t("textPlaceholder")}
                      value={answer?.textValue ?? ""}
                      onChange={(e) => updateText(q.id, e.target.value)}
                      sx={textFieldStyles}
                    />
                  )}
                </Box>
              );
            })
        ) : (
          <Box sx={pageContainerStyles}>
            <Typography sx={{ color: colors.slate400 }}>{t("noQuestions")}</Typography>
          </Box>
        )}

        {state.error && (
          <Typography color="error" role="alert" variant="body2">
            {state.error}
          </Typography>
        )}

        <Button onClick={() => setConfirmOpen(true)} disabled={isPending} sx={smallButtonStyles}>
          {t("submitReview")}
        </Button>
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        title={t("submitReview")}
        message={t("submitConfirm")}
        confirmLabel={t("submitReview")}
        onConfirm={() => {
          setConfirmOpen(false);
          const fd = new FormData();
          fd.append("requestId", request.id);
          fd.append("answers", JSON.stringify(answers));
          formAction(fd);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
}
