"use client";

import { updateUserRole, updateUserPermission } from "@/serverActions";
import {
  colors,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { completeTutorialStep } from "@/tutorialConfig";

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
}

type FormState = { error: string | null };

const roleColors: Record<string, string> = {
  superuser: "#f59e0b",
  administrator: "#3b82f6",
  user: colors.slate300,
  guest: colors.slate400,
};

export default function UserPermissionEditor({
  user,
  allPermissionKeys,
  roleDefaults,
  canAssignPermissions,
}: UserPermissionEditorProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [selectedRole, setSelectedRole] = useState(user.role);
  const roleChanged = selectedRole !== user.role;
  const isSuperuser = user.role === "superuser";
  const [isPending, startTransition] = useTransition();
  const [permError, setPermError] = useState<string | null>(null);

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
      } catch (e) {
        setPermError(e instanceof Error ? e.message : tc("error"));
      }
    });
  };

  const formatKey = (key: string) => {
    const [domain, action] = key.split(":");
    return `${domain}:${action}`;
  };

  const groupedKeys = allPermissionKeys.reduce(
    (acc, key) => {
      const [domain] = key.split(":");
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(key);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  return (
    <Box data-tutorial="permission-editor">
      <Box component="form" action={roleAction} sx={formStyles}>
        <Box sx={headerStyles}>
          <Typography variant="h5">{t("userRole")}</Typography>
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
        {roleState.error && <Typography color="error">{roleState.error}</Typography>}
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
            <FormControl size="small" sx={{ minWidth: 200 }}>
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
                <MenuItem value="administrator">{t("roleAdministrator")}</MenuItem>
                <MenuItem value="user">{t("roleUser")}</MenuItem>
                <MenuItem value="guest">{t("roleGuest")}</MenuItem>
              </Select>
            </FormControl>
            <Box display="flex" gap={1} justifyContent="flex-end">
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
          <Typography variant="h5">{t("permissions")}</Typography>
        </Box>
        {permError && <Typography color="error">{permError}</Typography>}
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
              <TableContainer component={Paper} sx={{ backgroundColor: "transparent" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: colors.slate400 }}>{t("permission")}</TableCell>
                      <Tooltip title={t("roleDefaultTooltip")} placement="top" arrow>
                        <TableCell sx={{ color: colors.slate400, cursor: "help" }}>
                          {t("roleDefault")}
                        </TableCell>
                      </Tooltip>
                      <Tooltip title={t("overrideTooltip")} placement="top" arrow>
                        <TableCell sx={{ color: colors.slate400, cursor: "help" }}>
                          {t("override")}
                        </TableCell>
                      </Tooltip>
                      <Tooltip title={t("effectiveTooltip")} placement="top" arrow>
                        <TableCell sx={{ color: colors.slate400, cursor: "help" }}>
                          {t("effective")}
                        </TableCell>
                      </Tooltip>
                      <Tooltip title={t("actionsTooltip")} placement="top" arrow>
                        <TableCell sx={{ color: colors.slate400, cursor: "help" }} align="right">
                          {t("actions")}
                        </TableCell>
                      </Tooltip>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {keys.map((key) => {
                      const isDefault = defaults.includes(key);
                      const override = overrideMap.get(key);
                      const hasOverride = override !== undefined;
                      const effective = hasOverride ? override : isDefault;

                      return (
                        <TableRow key={key}>
                          <TableCell sx={{ color: colors.slate300 }}>{formatKey(key)}</TableCell>
                          <TableCell>
                            <Chip
                              label={isDefault ? t("allowed") : t("denied")}
                              size="small"
                              sx={{
                                color: isDefault ? colors.green400 : "#f87171",
                                borderColor: isDefault ? colors.green400 : "#f87171",
                              }}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {hasOverride ? (
                              <Chip
                                label={override ? t("granted") : t("denied")}
                                size="small"
                                sx={{
                                  color: override ? colors.green400 : "#f87171",
                                  borderColor: override ? colors.green400 : "#f87171",
                                  fontWeight: 600,
                                }}
                                variant="outlined"
                              />
                            ) : (
                              <Typography variant="body2" sx={{ color: colors.slate400 }}>
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={effective ? t("allowed") : t("denied")}
                              size="small"
                              sx={{
                                backgroundColor: effective
                                  ? "rgba(74, 222, 128, 0.15)"
                                  : "rgba(248, 113, 113, 0.15)",
                                color: effective ? colors.green400 : "#f87171",
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box display="flex" gap={0.5} justifyContent="flex-end">
                              {hasOverride ? (
                                <Button
                                  size="small"
                                  disabled={isPending}
                                  onClick={() => handlePermissionAction(key, "reset")}
                                  sx={{
                                    color: colors.slate400,
                                    fontSize: "0.7rem",
                                    minWidth: "auto",
                                    px: 1,
                                  }}
                                >
                                  {tc("reset")}
                                </Button>
                              ) : effective ? (
                                <Button
                                  size="small"
                                  disabled={isPending}
                                  onClick={() => handlePermissionAction(key, "deny")}
                                  sx={{
                                    color: "#f87171",
                                    fontSize: "0.7rem",
                                    minWidth: "auto",
                                    px: 1,
                                  }}
                                >
                                  {t("deny")}
                                </Button>
                              ) : (
                                <Button
                                  size="small"
                                  disabled={isPending}
                                  onClick={() => handlePermissionAction(key, "grant")}
                                  sx={{
                                    color: colors.green400,
                                    fontSize: "0.7rem",
                                    minWidth: "auto",
                                    px: 1,
                                  }}
                                >
                                  {t("grant")}
                                </Button>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
