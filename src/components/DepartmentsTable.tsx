"use client";

import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { ApartmentOutlined } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Department } from "@/schemas";
import { colors } from "@/muiStyles";
import DataTable, { Column, MobileDetail } from "./DataTable";

// ─── Shared mobile details for departments ───────────────────────────────────

function useDeptMobileDetails(
  t: ReturnType<typeof useTranslations>,
  tc: ReturnType<typeof useTranslations>,
): MobileDetail<Department>[] {
  return [
    {
      render: (dept) =>
        dept.description ? (
          <Typography variant="body2" sx={{ color: colors.slate300 }}>
            {dept.description}
          </Typography>
        ) : null,
    },
    {
      render: (dept) => (
        <Typography variant="body2" sx={{ color: colors.slate300 }}>
          {t("head")}: {dept.headName || t("noHead")}
        </Typography>
      ),
    },
    {
      render: (dept) =>
        dept.teams.length > 0 ? (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: colors.slate400 }}>
              {t("teamsHeader")}:
            </Typography>
            {dept.teams.map((team) => (
              <Typography key={team.teamId} variant="body2" sx={{ color: colors.slate300, pl: 1 }}>
                {team.teamName}
              </Typography>
            ))}
          </Box>
        ) : null,
    },
    {
      render: (dept) => (
        <Typography variant="caption" sx={{ color: colors.slate400, mt: 0.5, display: "block" }}>
          {tc("createdAt")}: {new Date(dept.createdAt).toLocaleString()}
        </Typography>
      ),
    },
  ];
}

// ─── Read-only variant ───────────────────────────────────────────────────────

interface DepartmentsTableProps {
  departments: Department[];
  minimal?: boolean;
}

export function DepartmentsTable({ departments, minimal = false }: DepartmentsTableProps) {
  const t = useTranslations("departments");
  const tc = useTranslations("common");

  const columns: Column<Department>[] = [
    { header: tc("name"), accessor: (dept) => dept.name },
    {
      header: (
        <Tooltip title={t("descriptionTooltip")} placement="top" arrow>
          <span style={{ cursor: "help" }}>{t("description")}</span>
        </Tooltip>
      ),
      accessor: (dept) => dept.description || tc("dash"),
    },
    {
      header: (
        <Tooltip title={t("headTooltip")} placement="top" arrow>
          <span style={{ cursor: "help" }}>{t("head")}</span>
        </Tooltip>
      ),
      accessor: (dept) => dept.headName || t("noHead"),
    },
    {
      header: (
        <Tooltip title={t("teamsTooltip")} placement="top" arrow>
          <span style={{ cursor: "help" }}>{t("teamsHeader")}</span>
        </Tooltip>
      ),
      accessor: (dept) => (
        <Box>
          {dept.teams.length > 0
            ? dept.teams.map((team) => (
                <Typography key={team.teamId} variant="body2">
                  {team.teamName}
                </Typography>
              ))
            : tc("dash")}
        </Box>
      ),
    },
    { header: tc("createdAt"), accessor: (dept) => new Date(dept.createdAt).toLocaleString() },
    { header: tc("updatedAt"), accessor: (dept) => new Date(dept.updatedAt).toLocaleString() },
  ];

  const mobileDetails = useDeptMobileDetails(t, tc);

  return (
    <DataTable<Department>
      data={departments}
      columns={columns}
      getRowKey={(dept) => dept.id}
      getItemName={(dept) => dept.name}
      emptyMessage={t("noDepartments")}
      minimal={minimal}
      mobileDetails={mobileDetails}
      tableAriaLabel="departments table"
    />
  );
}

// ─── Editable variant ────────────────────────────────────────────────────────

interface EditableDepartmentsTableProps {
  departments: Department[];
  canCreate?: boolean;
}

export function EditableDepartmentsTable({
  departments,
  canCreate,
}: EditableDepartmentsTableProps) {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  const router = useRouter();

  const columns: Column<Department>[] = [
    { header: tc("name"), accessor: (dept) => dept.name },
    { header: t("description"), accessor: (dept) => dept.description || tc("dash") },
    { header: t("head"), accessor: (dept) => dept.headName || t("noHead") },
    {
      header: t("teamsHeader"),
      accessor: (dept) => (
        <Box>
          {dept.teams.length > 0
            ? dept.teams.map((team) => (
                <Typography key={team.teamId} variant="body2">
                  {team.teamName}
                </Typography>
              ))
            : null}
        </Box>
      ),
    },
    { header: tc("createdAt"), accessor: (dept) => new Date(dept.createdAt).toLocaleString() },
    { header: tc("updatedAt"), accessor: (dept) => new Date(dept.updatedAt).toLocaleString() },
  ];

  const mobileDetails = useDeptMobileDetails(t, tc);

  return (
    <DataTable<Department>
      data={departments}
      columns={columns}
      getRowKey={(dept) => dept.id}
      getItemName={(dept) => dept.name}
      emptyMessage={t("noDepartments")}
      emptyIcon={ApartmentOutlined}
      emptySubtitle={canCreate ? t("noDepartmentsHint") : undefined}
      onRowClick={(id) => router.push(`/manageDepartments/${id}`)}
      clickTooltip={(dept) => t("clickToManage", { name: dept.name })}
      mobileDetails={mobileDetails}
      tableAriaLabel="departments table"
    />
  );
}

export default DepartmentsTable;
