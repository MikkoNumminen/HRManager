"use client";

import { updateUserRole, updateUserPermission, kickOutUser } from "@/serverActions";
import {
  colors,
  formButtonContainerStyles,
  formStyles,
  headerStyles,
  smallButtonStyles,
  activeButtonStyles,
} from "@/muiStyles";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useActionState, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { completeTutorialStep } from "@/tutorialConfig";
import { useSnackbar } from "./SnackbarProvider";
import ConfirmDialog from "./ConfirmDialog";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  overrides: { key: string; granted: boolean }[];
  resolvedPermissions: Record<string, boolean>;
}

interface UserPermissionEditorProps {
  user: UserData;
  allPermissionKeys: string[];
  roleDefaults: Record<string, string[]>;
  canAssignPermissions: boolean;
  isDemoSession?: boolean;
}

type FormState = { error: string | null };

const roleColors: Record<string, string> = {
  superuser: colors.warning,
  administrator: colors.info,
  user: colors.slate300,
  guest: colors.slate400,
};

export default function UserPermissionEditor({
  user,
  allPermissionKeys,
  roleDefaults,
  canAssignPermissions,
  isDemoSession,
}: UserPermissionEditorProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(user.role);
  const roleChanged = selectedRole !== user.role;
  // In demo sessions, superuser restrictions are lifted — users can experiment freely
  const isSuperuser = !isDemoSession && user.role === "superuser";
  const [isPending, startTransition] = useTransition();
  const [permError, setPermError] = useState<string | null>(null);
  const [kickOutOpen, setKickOutOpen] = useState(false);
  const [kickOutPending, setKickOutPending] = useState(false);

  const roleLabels: Record<string, string> = {
    superuser: t("roleSuperuser"),
    administrator: t("roleAdministrator"),
    user: t("roleUser"),
    guest: t("roleGuest"),
  };

  const [roleState, roleAction, roleIsPending] = useActionState(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      try {
        await updateUserRole(formData);
        showSnackbar(tn("roleUpdated"));
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : tc("error") };
      }
    },
    { error: null },
  );

  const defaults = roleDefaults[selectedRole] ?? [];
  const overrideMap = new Map(user.overrides.map((o) => [o.key, o.granted]));

  const handlePermissionAction = (permissionKey: string, action: "grant" | "deny" | "reset") => {
    setPermError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("userId", user.id);
        formData.set("permissionKey", permissionKey);
        formData.set("action", action);
        await updateUserPermission(formData);
        completeTutorialStep("manage_permissions");
        showSnackbar(tn("permissionUpdated"));
      } catch (e) {
        setPermError(e instanceof Error ? e.message : tc("error"));
      }
    });
  };

  const handleKickOut = async () => {
    setKickOutPending(true);
    try {
      const formData = new FormData();
      formData.set("userId", user.id);
      await kickOutUser(formData);
      showSnackbar(tn("userKickedOut", { name: user.name ?? user.email }));
      router.push("/admin");
    } catch (e) {
      setPermError(e instanceof Error ? e.message : tc("error"));
      setKickOutPending(false);
    }
    setKickOutOpen(false);
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
    <Box data-tutorial="permission-editor">
      <Box component="form" action={roleAction} sx={formStyles}>
        <Box sx={headerStyles}>
          <Typography variant="h6">{t("userRole")}</Typography>
          <Chip
            label={roleLabels[user.role] ?? user.role}
            size="small"
            sx={{
              color: roleColors[user.role] ?? colors.slate300,
              borderColor: roleColors[user.role] ?? colors.slate300,
              fontWeight: 600,
              textTransform: "capitalize",
            }}
            variant="outlined"
          />
        </Box>
        {roleState.error && (
          <Typography color="error" role="alert">
            {roleState.error}
          </Typography>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {user.name ?? tc("unknown")} ({user.email})
          </Typography>
        </Box>
        <input type="hidden" name="userId" value={user.id} />
        {isSuperuser ? (
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {t("superuserCannotChange")}
          </Typography>
        ) : (
          <>
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
              <InputLabel sx={{ color: colors.slate400 }}>{t("role")}</InputLabel>
              <Select
                name="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                label={t("role")}
                sx={{
                  color: colors.slate300,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate300 },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate100 },
                  "& .MuiSvgIcon-root": { color: colors.slate300 },
                }}
              >
                {isDemoSession && <MenuItem value="superuser">{t("roleSuperuser")}</MenuItem>}
                <MenuItem value="administrator">{t("roleAdministrator")}</MenuItem>
                <MenuItem value="user">{t("roleUser")}</MenuItem>
                <MenuItem value="guest">{t("roleGuest")}</MenuItem>
              </Select>
            </FormControl>
            <Box sx={formButtonContainerStyles}>
              <Button
                type="submit"
                disabled={!roleChanged || roleIsPending}
                sx={{ ...smallButtonStyles, ...(roleChanged && activeButtonStyles) }}
              >
                {t("saveRole")}
              </Button>
            </Box>
          </>
        )}
      </Box>

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
                const isDefault = defaults.includes(key);
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

      {!isSuperuser && (
        <Box sx={formStyles}>
          <Box sx={headerStyles}>
            <Typography variant="h6" sx={{ color: colors.error }}>
              {t("dangerZone")}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              flexDirection: { xs: "column", sm: "row" },
              gap: { xs: 1.5, sm: 2 },
            }}
          >
            <Typography variant="body2" sx={{ color: colors.slate400 }}>
              {t("kickOutDescription")}
            </Typography>
            <Button
              onClick={() => setKickOutOpen(true)}
              disabled={kickOutPending}
              sx={{
                color: colors.error,
                borderColor: colors.error,
                "&:hover": { backgroundColor: colors.errorBg, borderColor: colors.error },
                minWidth: { xs: "auto", sm: 120 },
              }}
              variant="outlined"
            >
              {t("kickOut")}
            </Button>
          </Box>
          <ConfirmDialog
            open={kickOutOpen}
            title={t("kickOutTitle")}
            message={t("kickOutConfirm", { name: user.name ?? user.email })}
            confirmLabel={t("kickOut")}
            onConfirm={handleKickOut}
            onCancel={() => setKickOutOpen(false)}
          />
        </Box>
      )}
    </Box>
  );
}
