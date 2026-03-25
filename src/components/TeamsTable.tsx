"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { GroupsOutlined } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CombinedTeam } from "@/schemas";
import { colors } from "@/muiStyles";
import DataTable, { Column, MobileDetail } from "./DataTable";

// ─── Shared mobile details for teams ─────────────────────────────────────────

function useTeamMobileDetails(
  t: ReturnType<typeof useTranslations>,
  tc: ReturnType<typeof useTranslations>,
  unknownFallback?: string,
): MobileDetail<CombinedTeam>[] {
  return [
    {
      render: (team) => (
        <Typography variant="body2" sx={{ color: colors.slate300 }}>
          {t("teamManager")}: {team.managerName || t("noManager")}
        </Typography>
      ),
    },
    {
      render: (team) =>
        team.members && team.members.length > 0 ? (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: colors.slate400 }}>
              {t("teamMembers")}:
            </Typography>
            {team.members.map((member) => (
              <Typography
                key={member.personId}
                variant="body2"
                sx={{ color: colors.slate300, pl: 1 }}
              >
                {member?.name || unknownFallback || tc("unknown")}
              </Typography>
            ))}
          </Box>
        ) : null,
    },
    {
      render: (team) => (
        <Typography variant="caption" sx={{ color: colors.slate400, mt: 0.5, display: "block" }}>
          {tc("createdAt")}: {new Date(team.createdAt).toLocaleString()}
        </Typography>
      ),
    },
  ];
}

// ─── Read-only variant ───────────────────────────────────────────────────────

interface TeamsTableProps {
  combinedTeams: CombinedTeam[];
  minimal?: boolean;
}

export function TeamsTable({ combinedTeams, minimal = false }: TeamsTableProps) {
  const t = useTranslations("teams");
  const tc = useTranslations("common");

  const columns: Column<CombinedTeam>[] = [
    { header: t("teamName"), accessor: (team) => team.teamName },
    { header: t("teamManager"), accessor: (team) => team.managerName || t("noManager") },
    {
      header: t("teamMembers"),
      accessor: (team) => (
        <Box>
          {team.members.map((member) => (
            <Typography key={member.personId} variant="body2">
              {member.name}
            </Typography>
          ))}
        </Box>
      ),
    },
    { header: tc("createdAt"), accessor: (team) => new Date(team.createdAt).toLocaleString() },
    { header: tc("updatedAt"), accessor: (team) => new Date(team.updatedAt).toLocaleString() },
  ];

  const mobileDetails = useTeamMobileDetails(t, tc);

  return (
    <DataTable<CombinedTeam>
      data={combinedTeams}
      columns={columns}
      getRowKey={(team) => team.teamId}
      getItemName={(team) => team.teamName}
      emptyMessage={t("noTeams")}
      minimal={minimal}
      mobileDetails={mobileDetails}
      tableAriaLabel="teams table"
    />
  );
}

// ─── Editable variant ────────────────────────────────────────────────────────

interface EditableTeamsTableProps {
  combinedTeams: CombinedTeam[];
  canCreate?: boolean;
}

export function EditableTeamsTable({ combinedTeams, canCreate }: EditableTeamsTableProps) {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const router = useRouter();

  const columns: Column<CombinedTeam>[] = [
    { header: t("teamName"), accessor: (team) => team.teamName },
    { header: t("teamManager"), accessor: (team) => team.managerName || t("noManager") },
    {
      header: t("teamMembers"),
      accessor: (team) => (
        <Box>
          {team.members && team.members.length > 0
            ? team.members.map((member) => (
                <Typography key={member.personId} variant="body2">
                  {member?.name || tc("unknown")}
                </Typography>
              ))
            : null}
        </Box>
      ),
    },
    { header: tc("createdAt"), accessor: (team) => new Date(team.createdAt).toLocaleString() },
    { header: tc("updatedAt"), accessor: (team) => new Date(team.updatedAt).toLocaleString() },
  ];

  const mobileDetails = useTeamMobileDetails(t, tc, tc("unknown"));

  return (
    <DataTable<CombinedTeam>
      data={combinedTeams}
      columns={columns}
      getRowKey={(team) => team.teamId}
      getItemName={(team) => team.teamName}
      emptyMessage={t("noTeams")}
      emptyIcon={GroupsOutlined}
      emptySubtitle={canCreate ? t("noTeamsHint") : undefined}
      onRowClick={(id) => router.push(`/manageTeams/${id}`)}
      clickTooltip={(team) => t("clickToManage", { name: team.teamName })}
      mobileDetails={mobileDetails}
      tableAriaLabel="teams table"
    />
  );
}

export default TeamsTable;
