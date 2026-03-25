"use client";

import {
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { memo, useMemo, useCallback, useState } from "react";
import { colors, mobileCardStyles } from "@/muiStyles";
import { formatDate } from "@/utils/formatDate";
import { AuditLog } from "@/schemas";
import { describeChanges as describeChangesUtil } from "@/utils/auditLogDescriber";

const actionColors: Record<string, string> = {
  create: colors.success,
  update: colors.info,
  delete: colors.error,
  seed: colors.warning,
  reset: colors.warning,
  permission_denied: colors.error,
  rate_limited: colors.error,
  import: colors.info,
  export: colors.slate300,
};

const selectStyles = {
  color: colors.slate300,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate300 },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate100 },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.slate100 },
  "& .MuiSvgIcon-root": { color: colors.slate400 },
  minWidth: { xs: "100%", sm: 150 },
};

const labelStyles = { color: colors.slate400, "&.Mui-focused": { color: colors.slate100 } };

interface AuditLogViewerProps {
  logs: AuditLog[];
  total: number;
  currentPage: number;
  pageSize: number;
  userEmails: string[];
  userNames?: Record<string, string>;
  currentFilters: {
    userEmail?: string;
    action?: string;
    entityType?: string;
  };
}

function AuditLogViewer({
  logs,
  total,
  currentPage,
  pageSize,
  userEmails,
  userNames = {},
  currentFilters,
}: AuditLogViewerProps) {
  const t = useTranslations("audit");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const permissionLabels: Record<string, string> = useMemo(
    () => ({
      "person:create": t("permCreatePeople"),
      "person:delete": t("permDeletePeople"),
      "person:update_name": t("permChangeName"),
      "person:update_position": t("permChangePosition"),
      "person:update_email": t("permChangeEmail"),
      "person:read": t("permViewPeople"),
      "team:create": t("permCreateTeams"),
      "team:delete": t("permDeleteTeams"),
      "team:update_name": t("permRenameTeams"),
      "team:update_manager": t("permChangeManager"),
      "team:add_member": t("permAddMembers"),
      "team:remove_member": t("permRemoveMembers"),
      "team:read": t("permViewTeams"),
      "department:create": t("permCreateDepartments"),
      "department:delete": t("permDeleteDepartments"),
      "department:update": t("permUpdateDepartments"),
      "department:assign_team": t("permAssignTeams"),
      "department:read": t("permViewDepartments"),
      "data:reset": t("permResetData"),
      "data:seed": t("permSeedData"),
      "admin:manage_users": t("permManageUsers"),
      "admin:assign_permissions": t("permChangePermissions"),
      "admin:view_audit_log": t("permViewAuditLog"),
      "dashboard:view": t("permViewDashboard"),
      "data:import": t("permImportData"),
      "data:export": t("permExportData"),
    }),
    [t],
  );

  const describeChanges = useCallback(
    (action: string, entityType: string, before: string | null, after: string | null): string =>
      describeChangesUtil({
        action,
        entityType,
        before,
        after,
        t,
        tc,
        permissionLabels,
        userNames,
      }),
    [t, tc, permissionLabels, userNames],
  );

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/admin/audit?${params.toString()}`);
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage + 1));
    router.push(`/admin/audit?${params.toString()}`);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", e.target.value);
    params.set("page", "1");
    router.push(`/admin/audit?${params.toString()}`);
  };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [
    currentFilters.userEmail,
    currentFilters.action,
    currentFilters.entityType,
  ].filter(Boolean).length;

  const filterControls = (
    <Box display="flex" gap={{ xs: 1, sm: 2 }} mb={2} flexWrap="wrap">
      <FormControl size="small">
        <InputLabel sx={labelStyles}>{t("filterUser")}</InputLabel>
        <Select
          value={currentFilters.userEmail ?? ""}
          onChange={(e) => updateFilter("userEmail", e.target.value)}
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
          onChange={(e) => updateFilter("action", e.target.value)}
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
          onChange={(e) => updateFilter("entityType", e.target.value)}
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

  return (
    <>
      {/* Desktop filters — always visible */}
      <Box sx={{ display: { xs: "none", md: "block" } }}>{filterControls}</Box>

      {/* Mobile filters — collapsible */}
      <Box sx={{ display: { xs: "block", md: "none" }, mb: 2 }}>
        <Button
          onClick={() => setFiltersOpen(!filtersOpen)}
          startIcon={<FilterListIcon />}
          sx={{
            color: colors.slate300,
            borderColor: colors.slate300,
            mb: 1,
            width: "100%",
            justifyContent: "flex-start",
          }}
          variant="outlined"
          data-testid="filter-toggle"
        >
          {t("filters")}
          {activeFilterCount > 0 && ` (${activeFilterCount})`}
        </Button>
        <Collapse in={filtersOpen}>{filterControls}</Collapse>
      </Box>

      {/* Desktop table view */}
      <Box data-testid="table-view" sx={{ display: { xs: "none", md: "block" } }}>
        <TableContainer component={Paper}>
          <Table sx={{ tableLayout: "fixed", width: "100%" }} aria-label="audit log table">
            <TableHead>
              <TableRow>
                <Tooltip title={t("tooltipTimestamp")} placement="top" arrow>
                  <TableCell
                    scope="col"
                    sx={{ color: colors.slate400, cursor: "help", width: "15%" }}
                  >
                    {t("columnTimestamp")}
                  </TableCell>
                </Tooltip>
                <Tooltip title={t("tooltipUser")} placement="top" arrow>
                  <TableCell
                    scope="col"
                    sx={{ color: colors.slate400, cursor: "help", width: "18%" }}
                  >
                    {t("columnUser")}
                  </TableCell>
                </Tooltip>
                <Tooltip title={t("tooltipAction")} placement="top" arrow>
                  <TableCell
                    scope="col"
                    sx={{ color: colors.slate400, cursor: "help", width: "9%" }}
                  >
                    {t("columnAction")}
                  </TableCell>
                </Tooltip>
                <Tooltip title={t("tooltipType")} placement="top" arrow>
                  <TableCell
                    scope="col"
                    sx={{ color: colors.slate400, cursor: "help", width: "10%" }}
                  >
                    {t("columnType")}
                  </TableCell>
                </Tooltip>
                <Tooltip title={t("tooltipChanges")} placement="top" arrow>
                  <TableCell scope="col" sx={{ color: colors.slate400, cursor: "help" }}>
                    {t("columnChanges")}
                  </TableCell>
                </Tooltip>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                      <Typography align="center">{t("noEntries")}</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell
                      sx={{ whiteSpace: "nowrap", fontSize: { xs: "0.75rem", sm: "0.8rem" } }}
                    >
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Tooltip title={log.userEmail ?? t("system")} placement="top" arrow>
                        <Typography
                          variant="body2"
                          sx={{
                            cursor: "help",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {(log.userEmail && userNames[log.userEmail]) ??
                            log.userEmail ??
                            t("system")}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        size="small"
                        sx={{
                          color: actionColors[log.action] ?? colors.slate300,
                          borderColor: actionColors[log.action] ?? colors.slate300,
                          fontWeight: 600,
                          textTransform: "capitalize",
                        }}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{entityTypeLabels[log.entityType] ?? log.entityType}</TableCell>
                    <TableCell>
                      <Tooltip
                        title={describeChanges(log.action, log.entityType, log.before, log.after)}
                        placement="top"
                        arrow
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            cursor: "help",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            wordBreak: "break-word",
                          }}
                        >
                          {describeChanges(log.action, log.entityType, log.before, log.after)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={currentPage - 1}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
            sx={{ color: colors.slate300 }}
          />
        </TableContainer>
      </Box>

      {/* Mobile card view */}
      <Box data-testid="card-view" sx={{ display: { xs: "block", md: "none" } }}>
        {logs.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100px">
            <Typography align="center">{t("noEntries")}</Typography>
          </Box>
        ) : (
          <>
            {logs.map((log) => (
              <Box key={log.id} sx={mobileCardStyles}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Chip
                    label={log.action}
                    size="small"
                    sx={{
                      color: actionColors[log.action] ?? colors.slate300,
                      borderColor: actionColors[log.action] ?? colors.slate300,
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                    variant="outlined"
                  />
                  <Typography variant="caption" sx={{ color: colors.slate400 }}>
                    {entityTypeLabels[log.entityType] ?? log.entityType}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: colors.slate100, mb: 0.5, wordBreak: "break-word" }}
                >
                  {describeChanges(log.action, log.entityType, log.before, log.after)}
                </Typography>
                <Typography variant="caption" sx={{ color: colors.slate400 }}>
                  {(log.userEmail && userNames[log.userEmail]) ?? log.userEmail ?? t("system")}
                  {" · "}
                  {formatDate(log.createdAt)}
                </Typography>
              </Box>
            ))}
            <TablePagination
              component="div"
              count={total}
              page={currentPage - 1}
              onPageChange={handlePageChange}
              rowsPerPage={pageSize}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[10, 25, 50, 100]}
              sx={{ color: colors.slate300 }}
            />
          </>
        )}
      </Box>
    </>
  );
}

export default memo(AuditLogViewer);
