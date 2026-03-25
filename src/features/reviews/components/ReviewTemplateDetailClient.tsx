"use client";

import { useTransition, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  colors,
  formStyles,
  pageContainerStyles,
  textFieldStyles,
  smallButtonStyles,
} from "@/muiStyles";
import { ReviewTemplate } from "@/schemas";
import { addReviewQuestion, removeReviewQuestion } from "@/features/reviews/actions";
import { useFormAction } from "@/hooks/useFormAction";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useTranslations } from "next-intl";

interface Props {
  template: ReviewTemplate;
}

export default function ReviewTemplateDetailClient({ template }: Props) {
  const t = useTranslations("reviews");
  const tc = useTranslations("common");
  const tn = useTranslations("reviewNotifications");
  const [, startTransition] = useTransition();
  const [questionType, setQuestionType] = useState<"RATING" | "TEXT">("RATING");
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  const [addState, addAction, isAdding] = useFormAction(addReviewQuestion, {
    successMessage: tn("questionAdded"),
  });

  const [removeState, removeAction, isRemoving] = useFormAction(removeReviewQuestion, {
    successMessage: tn("questionRemoved"),
    onSuccess: () => setDeleteQuestionId(null),
  });

  return (
    <Box>
      {template.description && (
        <Typography variant="body2" sx={{ color: colors.slate400, mb: 2 }}>
          {template.description}
        </Typography>
      )}

      <Box sx={formStyles}>
        <Typography variant="h6" sx={{ color: colors.slate100 }}>
          {t("addQuestion")}
        </Typography>
        <Box
          component="form"
          action={addAction}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <input type="hidden" name="templateId" value={template.id} />
          <TextField
            name="text"
            label={t("questionText")}
            required
            multiline
            minRows={2}
            sx={textFieldStyles}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControl sx={textFieldStyles}>
            <InputLabel shrink>{t("questionType")}</InputLabel>
            <Select
              name="type"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as "RATING" | "TEXT")}
              label={t("questionType")}
              inputProps={{ "aria-label": t("questionType") }}
            >
              <MenuItem value="RATING">{t("typeRating")}</MenuItem>
              <MenuItem value="TEXT">{t("typeText")}</MenuItem>
            </Select>
          </FormControl>
          {questionType === "RATING" && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                name="scaleMin"
                label={t("scaleMin")}
                type="number"
                defaultValue={1}
                sx={{ ...textFieldStyles, flex: 1 }}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1, max: 5 } }}
              />
              <TextField
                name="scaleMax"
                label={t("scaleMax")}
                type="number"
                defaultValue={5}
                sx={{ ...textFieldStyles, flex: 1 }}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 2, max: 10 } }}
              />
            </Box>
          )}
          <FormControlLabel
            control={<Switch name="required" defaultChecked sx={{ color: colors.slate300 }} />}
            label={t("required")}
            sx={{ color: colors.slate300 }}
          />
          {addState.error && (
            <Typography color="error" role="alert" variant="body2">
              {addState.error}
            </Typography>
          )}
          <Button type="submit" disabled={isAdding} startIcon={<AddIcon />} sx={smallButtonStyles}>
            {t("addQuestion")}
          </Button>
        </Box>
      </Box>

      <Box sx={pageContainerStyles}>
        <Typography variant="h6" sx={{ color: colors.slate100, mb: 2 }}>
          {t("questions")} ({template.questions.length})
        </Typography>
        {removeState.error && (
          <Typography color="error" role="alert" variant="body2" sx={{ mb: 1 }}>
            {removeState.error}
          </Typography>
        )}
        {template.questions.length === 0 ? (
          <Typography sx={{ color: colors.slate400 }}>{t("noQuestions")}</Typography>
        ) : (
          <List disablePadding>
            {template.questions
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((q, idx) => (
                <ListItem key={q.id} disablePadding divider>
                  <ListItemText
                    sx={{ pl: 1, py: 1 }}
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" sx={{ color: colors.slate400, minWidth: 24 }}>
                          {idx + 1}.
                        </Typography>
                        <Typography sx={{ color: colors.slate100 }}>{q.text}</Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: "flex", gap: 1, mt: 0.5, pl: 3 }}>
                        <Chip
                          label={q.type === "RATING" ? t("typeRating") : t("typeText")}
                          size="small"
                          sx={{ fontSize: "0.7rem" }}
                        />
                        {q.type === "RATING" && (
                          <Chip
                            label={`${q.scaleMin}–${q.scaleMax}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.7rem", borderColor: colors.slate300 }}
                          />
                        )}
                        {q.required && (
                          <Chip
                            label={t("required")}
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontSize: "0.7rem" }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      aria-label={t("removeRequest")}
                      edge="end"
                      onClick={() => setDeleteQuestionId(q.id)}
                      disabled={isRemoving}
                      sx={{ color: colors.error }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
          </List>
        )}
      </Box>

      <ConfirmDialog
        open={!!deleteQuestionId}
        title={t("removeRequest")}
        message={t("removeRequestConfirm")}
        confirmLabel={tc("remove")}
        onConfirm={() => {
          if (!deleteQuestionId) return;
          const fd = new FormData();
          fd.append("templateId", template.id);
          fd.append("questionId", deleteQuestionId);
          startTransition(() => removeAction(fd));
        }}
        onCancel={() => setDeleteQuestionId(null)}
      />
    </Box>
  );
}
