"use client";

import { Box, Button, Collapse } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { memo, useMemo, useCallback, useState } from "react";
import { colors } from "@/muiStyles";
import { AuditLog } from "@/schemas";
import { describeChanges as describeChangesUtil } from "@/utils/auditLogDescriber";
import AuditLogFilters from "./AuditLogFilters";
import AuditLogTable from "./AuditLogTable";
import AuditLogCardList from "./AuditLogCardList";

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

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set("page", "1");
      router.push(`/admin/audit?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handlePageChange = useCallback(
    (_: unknown, newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage + 1));
      router.push(`/admin/audit?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleRowsPerPageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("pageSize", e.target.value);
      params.set("page", "1");
      router.push(`/admin/audit?${params.toString()}`);
    },
    [router, searchParams],
  );

  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [
    currentFilters.userEmail,
    currentFilters.action,
    currentFilters.entityType,
  ].filter(Boolean).length;

  return (
    <>
      {/* Desktop filters — always visible */}
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <AuditLogFilters
          currentFilters={currentFilters}
          userEmails={userEmails}
          onFilterChange={updateFilter}
        />
      </Box>

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
        <Collapse in={filtersOpen}>
          <AuditLogFilters
            currentFilters={currentFilters}
            userEmails={userEmails}
            onFilterChange={updateFilter}
          />
        </Collapse>
      </Box>

      {/* Desktop table view */}
      <Box data-testid="table-view" sx={{ display: { xs: "none", md: "block" } }}>
        <AuditLogTable
          logs={logs}
          total={total}
          currentPage={currentPage}
          pageSize={pageSize}
          userNames={userNames}
          entityTypeLabels={entityTypeLabels}
          describeChanges={describeChanges}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </Box>

      {/* Mobile card view */}
      <Box data-testid="card-view" sx={{ display: { xs: "block", md: "none" } }}>
        <AuditLogCardList
          logs={logs}
          total={total}
          currentPage={currentPage}
          pageSize={pageSize}
          userNames={userNames}
          entityTypeLabels={entityTypeLabels}
          describeChanges={describeChanges}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </Box>
    </>
  );
}

export default memo(AuditLogViewer);
