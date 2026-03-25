"use client";

import { updateUserPermission } from "@/features/admin/actions";
import { colors, formStyles, headerStyles } from "@/muiStyles";
import { Box, Chip, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { completeTutorialStep } from "@/tutorialConfig";
import { useSnackbar } from "@/components/shared/SnackbarProvider";

interface PermissionGridProps {
  userId: string;
  allPermissionKeys: string[];
  roleDefaults: string[];
  overrides: { key: string; granted: boolean }[];
  isSuperuser: boolean;
  canAssignPermissions: boolean;
}

export default function PermissionGrid({
  userId,
  allPermissionKeys,
  roleDefaults,
  overrides,
  isSuperuser,
  canAssignPermissions,
}: PermissionGridProps) {
  const t = useTranslations("admin");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const [isPending, startTransition] = useTransition();
  const [permError, setPermError] = useState<string | null>(null);

  const overrideMap = new Map(overrides.map((o) => [o.key, o.granted]));

  const handlePermissionAction = (permissionKey: string, action: "grant" | "deny" | "reset") => {
    setPermError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", userId);
      formData.set("permissionKey", permissionKey);
      formData.set("action", action);
      const result = await updateUserPermission(formData);
      if (result?.error) {
        setPermError(result.error);
        return;
      }
      completeTutorialStep("manage_permissions");
      showSnackbar(tn("permissionUpdated"));
    });
  };

  const formatKey = (key: string) => {
    const [domain, action] = key.split(":");
    return `${domain}:${action}`;
  };

  const groupedKeys = useMemo(
    () =>
      allPermissionKeys.reduce(
        (acc, key) => {
          const [domain] = key.split(":");
          if (!acc[domain]) acc[domain] = [];
          acc[domain].push(key);
          return acc;
        },
        {} as Record<string, string[]>,
      ),
    [allPermissionKeys],
  );

  return (
    <Box sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h6">{t("permissions")}</Typography>
      </Box>
      {permError && (
        <Typography color="error" role="alert">
          {permError}
        </Typography>
      )}
      {isSuperuser ? (
        <Typography variant="body2" sx={{ color: colors.slate400 }}>
          {t("superuserAllPermissions")}
        </Typography>
      ) : !canAssignPermissions ? (
        <Typography variant="body2" sx={{ color: colors.slate400 }}>
          {t("noPermission")}
        </Typography>
      ) : (
        Object.entries(groupedKeys).map(([domain, keys]) => (
          <Box key={domain} sx={{ mb: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{ color: colors.slate100, textTransform: "capitalize", mb: 1 }}
            >
              {domain}
            </Typography>
            {keys.map((key) => {
              const isDefault = roleDefaults.includes(key);
              const override = overrideMap.get(key);
              const hasOverride = override !== undefined;
              const effective = hasOverride ? override : isDefault;
              const toggleValue = hasOverride ? (override ? "grant" : "deny") : "default";

              return (
                <Box
                  key={key}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                    py: 1,
                    borderBottom: `1px solid ${colors.slate600}`,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: colors.slate300,
                        fontFamily: "monospace",
                        fontSize: { xs: "0.75rem", sm: "0.8rem" },
                      }}
                    >
                      {formatKey(key)}
                    </Typography>
                    <Chip
                      label={effective ? t("allowed") : t("denied")}
                      size="small"
                      sx={{
                        backgroundColor: effective ? "rgba(74, 222, 128, 0.15)" : colors.errorBg,
                        color: effective ? colors.green400 : colors.error,
                        fontWeight: 600,
                        height: 20,
                        fontSize: { xs: "0.65rem", sm: "0.7rem" },
                      }}
                    />
                  </Box>
                  <ToggleButtonGroup
                    value={toggleValue}
                    exclusive
                    size="small"
                    disabled={isPending}
                    onChange={(_e, newValue) => {
                      if (!newValue) return;
                      if (newValue === "grant") handlePermissionAction(key, "grant");
                      else if (newValue === "deny") handlePermissionAction(key, "deny");
                      else handlePermissionAction(key, "reset");
                    }}
                    sx={{
                      "& .MuiToggleButton-root": {
                        color: colors.slate400,
                        borderColor: colors.slate400,
                        fontSize: "0.7rem",
                        py: 0.25,
                        px: 1.5,
                        textTransform: "none",
                      },
                      "& .Mui-selected": {
                        fontWeight: 600,
                      },
                    }}
                  >
                    <ToggleButton
                      value="deny"
                      sx={{
                        "&.Mui-selected, &.Mui-selected:hover": {
                          backgroundColor: colors.errorBg,
                          color: colors.error,
                        },
                      }}
                    >
                      {t("deny")}
                    </ToggleButton>
                    <Tooltip title={t("roleDefaultTooltip")} placement="top" arrow>
                      <ToggleButton
                        value="default"
                        sx={{
                          "&.Mui-selected, &.Mui-selected:hover": {
                            backgroundColor: "rgba(148, 163, 184, 0.15)",
                            color: colors.slate100,
                          },
                        }}
                      >
                        {t("roleDefault")}
                      </ToggleButton>
                    </Tooltip>
                    <ToggleButton
                      value="grant"
                      sx={{
                        "&.Mui-selected, &.Mui-selected:hover": {
                          backgroundColor: "rgba(74, 222, 128, 0.15)",
                          color: colors.green400,
                        },
                      }}
                    >
                      {t("grant")}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              );
            })}
          </Box>
        ))
      )}
    </Box>
  );
}
