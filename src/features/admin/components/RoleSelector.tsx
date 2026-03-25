"use client";

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
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateUserRole } from "@/features/admin/actions";
import { useFormAction } from "@/hooks/useFormAction";

const roleColors: Record<string, string> = {
  superuser: colors.warning,
  administrator: colors.info,
  user: colors.slate300,
  guest: colors.slate400,
};

interface RoleSelectorProps {
  userId: string;
  userName: string | null;
  userEmail: string;
  currentRole: string;
  isSuperuser: boolean;
  isDemoSession?: boolean;
}

export default function RoleSelector({
  userId,
  userName,
  userEmail,
  currentRole,
  isSuperuser,
  isDemoSession,
}: RoleSelectorProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tn = useTranslations("notifications");
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const roleChanged = selectedRole !== currentRole;

  const roleLabels: Record<string, string> = {
    superuser: t("roleSuperuser"),
    administrator: t("roleAdministrator"),
    user: t("roleUser"),
    guest: t("roleGuest"),
  };

  const [roleState, roleAction, roleIsPending] = useFormAction(updateUserRole, {
    successMessage: tn("roleUpdated"),
  });

  return (
    <Box component="form" action={roleAction} sx={formStyles}>
      <Box sx={headerStyles}>
        <Typography variant="h6">{t("userRole")}</Typography>
        <Chip
          label={roleLabels[currentRole] ?? currentRole}
          size="small"
          sx={{
            color: roleColors[currentRole] ?? colors.slate300,
            borderColor: roleColors[currentRole] ?? colors.slate300,
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
          {userName ?? tc("unknown")} ({userEmail})
        </Typography>
      </Box>
      <input type="hidden" name="userId" value={userId} />
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
  );
}
