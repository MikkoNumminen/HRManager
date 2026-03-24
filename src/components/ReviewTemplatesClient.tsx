"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  colors,
  formStyles,
  headerStyles,
  pageContainerStyles,
  textFieldStyles,
  smallButtonStyles,
} from "@/muiStyles";
import { ReviewTemplate } from "@/schemas";
import { createReviewTemplate, deleteReviewTemplate } from "@/serverActions";
import { useSnackbar } from "./SnackbarProvider";
import ConfirmDialog from "./ConfirmDialog";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface Props {
  templates: ReviewTemplate[];
}

type FormState = { error: string | null };

export default function ReviewTemplatesClient({ templates }: Props) {
  const t = useTranslations("reviews");
  const tc = useTranslations("common");
  const tn = useTranslations("reviewNotifications");
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [createState, createAction, isCreating] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await createReviewTemplate(formData);
      if (result?.error) return { error: result.error };
      showSnackbar(tn("templateCreated"));
      return { error: null };
    },
    { error: null },
  );

  const [deleteState, deleteAction, isDeleting] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await deleteReviewTemplate(formData);
      if (result?.error) return { error: result.error };
      showSnackbar(tn("templateDeleted"));
      setDeleteId(null);
      return { error: null };
    },
    { error: null },
  );

  const templateToDelete = templates.find((t) => t.id === deleteId);

  return (
    <Box>
      <Box sx={formStyles}>
        <Typography variant="h6" sx={{ color: colors.slate100 }}>
          {t("createTemplate")}
        </Typography>
        <Box
          component="form"
          action={createAction}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            name="name"
            label={t("enterTemplateName")}
            required
            sx={textFieldStyles}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            name="description"
            label={t("enterTemplateDescription")}
            sx={textFieldStyles}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {createState.error && (
            <Typography color="error" role="alert" variant="body2">
              {createState.error}
            </Typography>
          )}
          <Button
            type="submit"
            disabled={isCreating}
            startIcon={<AddIcon />}
            sx={smallButtonStyles}
          >
            {t("createTemplate")}
          </Button>
        </Box>
      </Box>

      <Box sx={pageContainerStyles}>
        <Typography variant="h6" sx={{ color: colors.slate100, mb: 2 }}>
          {t("templatesHeading")}
        </Typography>
        {deleteState.error && (
          <Typography color="error" role="alert" variant="body2" sx={{ mb: 1 }}>
            {deleteState.error}
          </Typography>
        )}
        {templates.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography sx={{ color: colors.slate400 }}>{t("noTemplates")}</Typography>
            <Typography variant="body2" sx={{ color: colors.slate400, mt: 1 }}>
              {t("noTemplatesHint")}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {templates.map((tmpl) => (
              <ListItem key={tmpl.id} disablePadding divider>
                <ListItemButton
                  onClick={() =>
                    startTransition(() => router.push(`/reviews/templates/${tmpl.id}`))
                  }
                  sx={{
                    color: colors.slate100,
                    "&:hover": { backgroundColor: colors.hoverOverlay },
                  }}
                >
                  <ListItemText
                    primary={tmpl.name}
                    secondary={
                      tmpl.description || `${tmpl.questions.length} ${t("questions").toLowerCase()}`
                    }
                    slotProps={{
                      primary: { sx: { color: colors.slate100 } },
                      secondary: { sx: { color: colors.slate400 } },
                    }}
                  />
                </ListItemButton>
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => setDeleteId(tmpl.id)}
                    disabled={isDeleting}
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
        open={!!deleteId}
        title={t("deleteTemplate")}
        message={t("deleteTemplateConfirm")}
        confirmLabel={tc("remove")}
        onConfirm={() => {
          if (!deleteId) return;
          const fd = new FormData();
          fd.append("templateId", deleteId);
          startTransition(() => deleteAction(fd));
        }}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
