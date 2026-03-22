"use client";

import {
  Box,
  Chip,
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
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { colors } from "@/muiStyles";
import { AuditLog } from "@/schemas";

const actionColors: Record<string, string> = {
  create: colors.success,
  update: colors.info,
  delete: colors.error,
  seed: colors.warning,
  reset: colors.warning,
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

export default function AuditLogViewer({
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

  const entityTypeLabels: Record<string, string> = {
    person: t("typePerson"),
    team: t("typeTeam"),
    teamMember: t("typeTeamMember"),
    department: t("typeDepartment"),
    user: t("typeUser"),
    userPermission: t("typePermission"),
  };

  const actionLabels: Record<string, string> = {
    create: t("actionCreate"),
    update: t("actionUpdate"),
    delete: t("actionDelete"),
    kickout: t("actionKickout"),
    seed: t("actionSeed"),
    reset: t("actionReset"),
  };

  const permissionLabels: Record<string, string> = {
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
  };

  const describeChanges = (
    action: string,
    entityType: string,
    before: string | null,
    after: string | null,
  ): string => {
    try {
      const b = before ? JSON.parse(before) : null;
      const a = after ? JSON.parse(after) : null;
      const unknown = tc("unknown");

      const resolveTarget = (): string => {
        const email = a?.targetEmail ?? b?.targetEmail;
        if (!email) return unknown;
        return userNames[email] ?? email;
      };

      if (action === "create") {
        if (entityType === "person") return t("addedPerson", { name: a?.name ?? unknown });
        if (entityType === "team") return t("createdTeam", { name: a?.teamName ?? unknown });
        if (entityType === "teamMember") return t("addedMember");
        if (entityType === "department")
          return t("createdDepartment", { name: a?.name ?? unknown });
        return t("newRecord");
      }

      if (action === "delete") {
        if (entityType === "person")
          return t("removedPerson", { name: b?.name ?? unknown, email: b?.email ?? "" });
        if (entityType === "team") return t("deletedTeam", { name: b?.teamName ?? unknown });
        if (entityType === "teamMember") return t("removedMember");
        if (entityType === "department")
          return t("deletedDepartment", { name: b?.name ?? unknown });
        if (entityType === "userPermission") {
          const key = b?.permissionKey ?? "";
          const label = permissionLabels[key] ?? key;
          const target = resolveTarget();
          return t("resetPermission", { target, label });
        }
        return t("recordDeleted");
      }

      if (action === "kickout") {
        if (entityType === "user") {
          return t("kickedOutUser", {
            name: b?.name ?? unknown,
            email: b?.email ?? "",
            role: b?.role ?? "",
          });
        }
        return t("recordDeleted");
      }

      if (action === "update") {
        if (entityType === "person") {
          if (a?.name !== undefined && b?.name !== a.name)
            return t("changedName", { oldValue: b?.name ?? "", newValue: a?.name ?? "" });
          if (a?.position !== undefined && b?.position !== a.position)
            return t("changedPosition", {
              oldValue: b?.position ?? "",
              newValue: a?.position ?? "",
            });
          if (a?.email !== undefined && b?.email !== a.email)
            return t("changedEmail", { oldValue: b?.email ?? "", newValue: a?.email ?? "" });
          return t("updatedPerson");
        }
        if (entityType === "team") {
          if (a?.teamName !== undefined && b?.teamName !== a.teamName)
            return t("renamedTeam", { oldValue: b?.teamName ?? "", newValue: a?.teamName ?? "" });
          if (a?.departmentId !== undefined) {
            if (a.departmentId === null) return t("removedTeamFromDept");
            return t("assignedTeamToDept");
          }
          if (a?.teamManagerId !== undefined) {
            if (a.teamManagerId === null) return t("removedManager");
            return t("changedManager");
          }
          return t("updatedTeam");
        }
        if (entityType === "department") {
          if (a?.headId !== undefined) {
            if (a.headId === null) return t("removedHead");
            return t("changedHead");
          }
          if (a?.name !== undefined && b?.name !== a.name)
            return t("renamedDepartment", { oldValue: b?.name ?? "", newValue: a?.name ?? "" });
          return t("updatedDepartment");
        }
        if (entityType === "user") {
          const target = resolveTarget();
          return t("changedRole", { target, oldValue: b?.role ?? "", newValue: a?.role ?? "" });
        }
        if (entityType === "userPermission") {
          const granted = a?.granted;
          const key = a?.permissionKey ?? "";
          const label = permissionLabels[key] ?? key;
          const target = resolveTarget();
          return granted
            ? t("grantedPermission", { target, label })
            : t("revokedPermission", { target, label });
        }
        return t("recordUpdated");
      }

      if (action === "seed") {
        return b?.clearExisting || a?.clearExisting ? t("seedReplaced") : t("seedKept");
      }

      if (action === "reset") {
        const persons = b?.personCount ?? b?.persons ?? 0;
        const teams = b?.teamCount ?? b?.teams ?? 0;
        const departments = b?.departmentCount ?? b?.departments ?? 0;
        return t("clearedData", {
          persons: String(persons),
          teams: String(teams),
          departments: String(departments),
        });
      }

      return tc("dash");
    } catch {
      return before ?? after ?? tc("dash");
    }
  };

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

  return (
    <>
      <Box display="flex" gap={{ xs: 1, sm: 2 }} mb={2} flexWrap="wrap">
        <FormControl size="small">
          <InputLabel sx={labelStyles}>{t("filterUser")}</InputLabel>
          <Select
            value={currentFilters.userEmail ?? ""}
            onChange={(e) => updateFilter("userEmail", e.target.value)}
            label={t("filterUser")}
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
                <TableCell scope="col" sx={{ color: colors.slate400, cursor: "help", width: "9%" }}>
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
                    {new Date(log.createdAt).toLocaleString()}
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
    </>
  );
}
