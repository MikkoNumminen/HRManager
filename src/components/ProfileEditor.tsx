"use client";

import { updateProfileName, updateProfileImage } from "@/serverActions";
import {
  colors,
  formStyles,
  headerStyles,
  textFieldStyles,
  smallButtonStyles,
  activeButtonStyles,
  formButtonContainerStyles,
} from "@/muiStyles";
import { Avatar, Box, Button, Chip, TextField, Tooltip, Typography } from "@mui/material";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useSnackbar } from "./SnackbarProvider";
import { UserProfile } from "@/schemas";
import TwoFactorSetup from "./TwoFactorSetup";

interface ProfileEditorProps {
  profile: UserProfile;
}

type FormState = { error: string | null };

const roleColors: Record<string, string> = {
  superuser: colors.warning,
  administrator: colors.info,
  user: colors.slate300,
  guest: colors.slate400,
};

export default function ProfileEditor({ profile }: ProfileEditorProps) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const ta = useTranslations("admin");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();

  const [nameValue, setNameValue] = useState(profile.name ?? "");
  const nameChanged = nameValue.trim() !== (profile.name ?? "");

  const [imageValue, setImageValue] = useState(profile.image ?? "");
  const imageChanged = imageValue.trim() !== (profile.image ?? "");

  const roleLabels: Record<string, string> = {
    superuser: ta("roleSuperuser"),
    administrator: ta("roleAdministrator"),
    user: ta("roleUser"),
    guest: ta("roleGuest"),
  };

  const [nameState, nameAction, nameIsPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await updateProfileName(formData);
      if (result?.error) return { error: result.error };
      showSnackbar(tn("profileNameUpdated"));
      return { error: null };
    },
    { error: null },
  );

  const [imageState, imageAction, imageIsPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await updateProfileImage(formData);
      if (result?.error) return { error: result.error };
      showSnackbar(tn("profileImageUpdated"));
      return { error: null };
    },
    { error: null },
  );

  const groupedPermissions = Object.entries(profile.resolvedPermissions).reduce(
    (acc, [key, value]) => {
      const [domain] = key.split(":");
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push({ key, allowed: value });
      return acc;
    },
    {} as Record<string, { key: string; allowed: boolean }[]>,
  );

  return (
    <Box>
      {/* Profile header with avatar */}
      <Box
        sx={{
          ...formStyles,
          alignItems: "center",
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 3 },
        }}
      >
        <Avatar
          src={profile.image ?? undefined}
          alt={t("avatar")}
          sx={{
            width: { xs: 80, sm: 96 },
            height: { xs: 80, sm: 96 },
            border: `2px solid ${colors.slate300}`,
            fontSize: "2rem",
          }}
        >
          {!profile.image &&
            profile.name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
        </Avatar>
        <Box sx={{ textAlign: { xs: "center", sm: "left" }, minWidth: 0 }}>
          <Typography variant="h5" sx={{ color: colors.slate100, fontWeight: 600 }}>
            {profile.name ?? profile.email}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {profile.email}
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 1,
              justifyContent: { xs: "center", sm: "flex-start" },
            }}
          >
            <Chip
              label={roleLabels[profile.role] ?? profile.role}
              size="small"
              variant="outlined"
              sx={{
                color: roleColors[profile.role] ?? colors.slate300,
                borderColor: roleColors[profile.role] ?? colors.slate300,
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            />
            <Tooltip title={t("joinedAt")} placement="top" arrow>
              <Typography
                variant="caption"
                sx={{ color: colors.slate400, alignSelf: "center", cursor: "help" }}
              >
                {profile.createdAt.toLocaleDateString()}
              </Typography>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Change name form */}
      <Box component="form" action={nameAction} sx={formStyles}>
        <Box sx={headerStyles}>
          <Typography variant="h6">{t("changeName")}</Typography>
        </Box>
        {nameState.error && (
          <Typography color="error" role="alert">
            {nameState.error}
          </Typography>
        )}
        <TextField
          name="name"
          label={t("enterNewName")}
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          size="small"
          fullWidth
          sx={{ ...textFieldStyles, maxWidth: { sm: 400 } }}
        />
        <Box sx={formButtonContainerStyles}>
          <Button
            type="submit"
            disabled={!nameChanged || nameIsPending}
            sx={{ ...smallButtonStyles, ...(nameChanged && activeButtonStyles) }}
          >
            {tc("save")}
          </Button>
        </Box>
      </Box>

      {/* Profile picture form */}
      <Box component="form" action={imageAction} sx={formStyles}>
        <Box sx={headerStyles}>
          <Typography variant="h6">{t("profilePicture")}</Typography>
        </Box>
        {imageState.error && (
          <Typography color="error" role="alert">
            {imageState.error}
          </Typography>
        )}
        <Typography variant="body2" sx={{ color: colors.slate400 }}>
          {t("imageHelp")}
        </Typography>
        <TextField
          name="image"
          label={t("imageUrl")}
          placeholder={t("imageUrlPlaceholder")}
          value={imageValue}
          onChange={(e) => setImageValue(e.target.value)}
          size="small"
          fullWidth
          sx={{ ...textFieldStyles, maxWidth: { sm: 500 } }}
        />
        <Box sx={formButtonContainerStyles}>
          {profile.image && (
            <Button
              type="submit"
              disabled={imageIsPending}
              onClick={() => setImageValue("")}
              sx={{ ...smallButtonStyles, color: colors.error }}
            >
              {t("removeImage")}
            </Button>
          )}
          <Button
            type="submit"
            disabled={!imageChanged || imageIsPending}
            sx={{ ...smallButtonStyles, ...(imageChanged && activeButtonStyles) }}
          >
            {tc("save")}
          </Button>
        </Box>
      </Box>

      {/* Two-Factor Authentication */}
      <TwoFactorSetup enabled={profile.twoFactorEnabled} />

      {/* Permissions summary */}
      <Box sx={formStyles}>
        <Box sx={headerStyles}>
          <Typography variant="h6">{t("permissions")}</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: colors.slate400 }}>
          {t("permissionsDescription")}
        </Typography>
        {Object.entries(groupedPermissions).map(([domain, perms]) => (
          <Box key={domain} sx={{ mb: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{ color: colors.slate100, textTransform: "capitalize", mb: 0.5 }}
            >
              {domain}
            </Typography>
            {perms.map(({ key, allowed }) => (
              <Box
                key={key}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 0.5,
                  borderBottom: `1px solid ${colors.slate600}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: colors.slate300,
                    fontFamily: "monospace",
                    fontSize: { xs: "0.75rem", sm: "0.8rem" },
                    flexGrow: 1,
                  }}
                >
                  {key}
                </Typography>
                <Chip
                  label={allowed ? t("allowed") : t("denied")}
                  size="small"
                  sx={{
                    backgroundColor: allowed ? "rgba(74, 222, 128, 0.15)" : colors.errorBg,
                    color: allowed ? colors.green400 : colors.error,
                    fontWeight: 600,
                    height: 20,
                    fontSize: { xs: "0.65rem", sm: "0.7rem" },
                  }}
                />
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
