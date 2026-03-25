"use client";

import { useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import {
  colors,
  formStyles,
  smallButtonStyles,
  activeButtonStyles,
  textFieldStyles,
  tableStyles,
  pageContainerStyles,
} from "@/muiStyles";
import { useSnackbar } from "./SnackbarProvider";
import { useTranslations } from "next-intl";
import type { FeatureFlag, UserFeatureFlag } from "@/features/featureFlags/schemas";
import type { AppUser, Permissions } from "@/schemas";
import {
  toggleFeatureFlag,
  setUserFeatureFlag,
  removeUserFeatureFlag,
} from "@/features/featureFlags/actions";

interface FeatureFlagDetailClientProps {
  flag: FeatureFlag;
  userFlags: UserFeatureFlag[];
  users: AppUser[];
  permissions: Permissions;
}

export default function FeatureFlagDetailClient({
  flag,
  userFlags,
  users,
  permissions,
}: FeatureFlagDetailClientProps) {
  const t = useTranslations("featureFlags");
  const tc = useTranslations("common");
  const { showSnackbar } = useSnackbar();
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [overrideEnabled, setOverrideEnabled] = useState(true);

  const canManage = permissions?.["admin:manage_feature_flags"];

  // Filter out users who already have overrides
  const existingUserIds = new Set(userFlags.map((uf) => uf.userId));
  const availableUsers = users.filter((u) => !existingUserIds.has(u.id));

  const handleGlobalToggle = async () => {
    const formData = new FormData();
    formData.append("flagId", flag.id);
    formData.append("enabled", String(!flag.enabled));
    const result = await toggleFeatureFlag(formData);
    if (result?.error) {
      showSnackbar(result.error);
    } else {
      showSnackbar(t("flagUpdated"));
    }
  };

  const handleAddOverride = async () => {
    if (!selectedUser) return;
    const formData = new FormData();
    formData.append("flagId", flag.id);
    formData.append("userId", selectedUser.id);
    formData.append("enabled", String(overrideEnabled));
    const result = await setUserFeatureFlag(formData);
    if (result?.error) {
      showSnackbar(result.error);
    } else {
      showSnackbar(t("flagUpdated"));
      setSelectedUser(null);
    }
  };

  const handleToggleUserOverride = async (userFlag: UserFeatureFlag) => {
    const formData = new FormData();
    formData.append("flagId", flag.id);
    formData.append("userId", userFlag.userId);
    formData.append("enabled", String(!userFlag.enabled));
    const result = await setUserFeatureFlag(formData);
    if (result?.error) {
      showSnackbar(result.error);
    } else {
      showSnackbar(t("flagUpdated"));
    }
  };

  const handleRemoveOverride = async (userFlag: UserFeatureFlag) => {
    const formData = new FormData();
    formData.append("flagId", flag.id);
    formData.append("userId", userFlag.userId);
    const result = await removeUserFeatureFlag(formData);
    if (result?.error) {
      showSnackbar(result.error);
    } else {
      showSnackbar(t("flagUpdated"));
    }
  };

  return (
    <>
      {/* Flag info card */}
      <Box sx={{ ...pageContainerStyles, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="h6" sx={{ color: colors.slate100 }}>
            {flag.name}
          </Typography>
          <Chip
            label={flag.scope === "GLOBAL" ? t("global") : t("perUser")}
            size="small"
            sx={{
              backgroundColor: flag.scope === "GLOBAL" ? colors.info : colors.warning,
              color: colors.slate100,
            }}
          />
        </Box>
        {flag.description && (
          <Typography sx={{ color: colors.slate400, mb: 1 }}>{flag.description}</Typography>
        )}
        <Typography variant="caption" sx={{ color: colors.slate400, display: "block" }}>
          {tc("createdAt")}: {flag.createdAt.toLocaleDateString()}
        </Typography>
        <Typography variant="caption" sx={{ color: colors.slate400, display: "block", mb: 1 }}>
          {tc("updatedAt")}: {flag.updatedAt.toLocaleDateString()}
        </Typography>

        {canManage && (
          <FormControlLabel
            control={<Switch checked={flag.enabled} onChange={handleGlobalToggle} />}
            label={t("toggleGlobal")}
            sx={{ color: colors.slate300 }}
          />
        )}
      </Box>

      {/* User overrides section — only for USER-scoped flags */}
      {flag.scope === "USER" && (
        <Box sx={{ ...pageContainerStyles, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ color: colors.slate100, mb: 1 }}>
            {t("userOverrides")}
          </Typography>

          {canManage && (
            <Box sx={{ ...formStyles, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ color: colors.slate100 }}>
                {t("addOverride")}
              </Typography>
              <Autocomplete
                options={availableUsers}
                getOptionLabel={(u) => `${u.name ?? ""} (${u.email})`}
                value={selectedUser}
                onChange={(_, val) => setSelectedUser(val)}
                renderInput={(params) => (
                  <TextField {...params} label={tc("email")} size="small" sx={textFieldStyles} />
                )}
                sx={{ minWidth: 250 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={overrideEnabled}
                    onChange={(_, checked) => setOverrideEnabled(checked)}
                  />
                }
                label={t("enabled")}
                sx={{ color: colors.slate300 }}
              />
              <Box>
                <Button
                  variant="outlined"
                  onClick={handleAddOverride}
                  disabled={!selectedUser}
                  startIcon={<AddIcon />}
                  sx={{ ...smallButtonStyles, ...activeButtonStyles }}
                >
                  {t("addOverride")}
                </Button>
              </Box>
            </Box>
          )}

          {userFlags.length === 0 ? (
            <Typography sx={{ color: colors.slate400, py: 2, textAlign: "center" }}>
              {t("noOverrides")}
            </Typography>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table sx={tableStyles}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: colors.slate400 }}>{tc("email")}</TableCell>
                    <TableCell sx={{ color: colors.slate400 }}>{t("enabled")}</TableCell>
                    {canManage && (
                      <TableCell sx={{ color: colors.slate400 }}>{tc("remove")}</TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userFlags.map((uf) => (
                    <TableRow key={uf.id} sx={{ "&:hover": { backgroundColor: colors.rowHover } }}>
                      <TableCell sx={{ color: colors.slate300 }}>
                        {uf.userName ? `${uf.userName} (${uf.userEmail})` : uf.userEmail}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <Switch
                            checked={uf.enabled}
                            onChange={() => handleToggleUserOverride(uf)}
                            size="small"
                          />
                        ) : (
                          <Typography sx={{ color: colors.slate300 }}>
                            {uf.enabled ? t("enabled") : t("disabled")}
                          </Typography>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <IconButton
                            aria-label={t("removeOverride")}
                            onClick={() => handleRemoveOverride(uf)}
                            sx={{ color: colors.error }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      )}

      <Button
        component={Link}
        href="/admin/feature-flags"
        startIcon={<ArrowBackIcon />}
        sx={{ ...smallButtonStyles, mt: 1 }}
      >
        {t("backToFlags")}
      </Button>
    </>
  );
}
