"use client";

import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useTranslations } from "next-intl";
import { memo, useMemo } from "react";
import { colors } from "@/muiStyles";

const selectStyles = {
  color: colors.slate300,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate300 },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate100 },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate100 },
  "& .MuiSvgIcon-root": { color: colors.slate400 },
  minWidth: { xs: "100%", sm: 150 },
};

const labelStyles = { color: colors.slate400, "&.Mui-focused": { color: colors.slate100 } };

interface AuditLogFiltersProps {
  currentFilters: {
    userEmail?: string;
    action?: string;
    entityType?: string;
  };
  userEmails: string[];
  onFilterChange: (key: string, value: string) => void;
}

function AuditLogFilters({ currentFilters, userEmails, onFilterChange }: AuditLogFiltersProps) {
  const t = useTranslations("audit");

  const entityTypeLabels: Record<string, string> = useMemo(
    () => ({
      person: t("typePerson"),
      team: t("typeTeam"),
      teamMember: t("typeTeamMember"),
      department: t("typeDepartment"),
      user: t("typeUser"),
      userPermission: t("typePermission"),
      auth: t("typeAuth"),
      security: t("typeSecurity"),
    }),
    [t],
  );

  const actionLabels: Record<string, string> = useMemo(
    () => ({
      create: t("actionCreate"),
      update: t("actionUpdate"),
      delete: t("actionDelete"),
      kickout: t("actionKickout"),
      seed: t("actionSeed"),
      reset: t("actionReset"),
      permission_denied: t("actionPermissionDenied"),
      rate_limited: t("actionRateLimited"),
      import: t("actionImport"),
      export: t("actionExport"),
    }),
    [t],
  );

  return (
    <Box display="flex" gap={{ xs: 1, sm: 2 }} mb={2} flexWrap="wrap">
      <FormControl size="small">
        <InputLabel sx={labelStyles}>{t("filterUser")}</InputLabel>
        <Select
          value={currentFilters.userEmail ?? ""}
          onChange={(e) => onFilterChange("userEmail", e.target.value)}
          label={t("filterUser")}
          inputProps={{ "aria-label": t("filterUser") }}
          sx={selectStyles}
        >
          <MenuItem value="">{t("allUsers")}</MenuItem>
          {userEmails.map((email) => (
            <MenuItem key={email} value={email}>
              {email}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel sx={labelStyles}>{t("filterAction")}</InputLabel>
        <Select
          value={currentFilters.action ?? ""}
          onChange={(e) => onFilterChange("action", e.target.value)}
          label={t("filterAction")}
          inputProps={{ "aria-label": t("filterAction") }}
          sx={selectStyles}
        >
          <MenuItem value="">{t("allActions")}</MenuItem>
          {Object.entries(actionLabels).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small">
        <InputLabel sx={labelStyles}>{t("filterType")}</InputLabel>
        <Select
          value={currentFilters.entityType ?? ""}
          onChange={(e) => onFilterChange("entityType", e.target.value)}
          label={t("filterType")}
          inputProps={{ "aria-label": t("filterType") }}
          sx={selectStyles}
        >
          <MenuItem value="">{t("allTypes")}</MenuItem>
          {Object.entries(entityTypeLabels).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}

export default memo(AuditLogFilters);
