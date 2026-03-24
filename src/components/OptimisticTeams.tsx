"use client";

import { useOptimistic } from "react";
import { CombinedTeam } from "@/schemas";
import { Box, Typography } from "@mui/material";
import { pageContainerStyles } from "@/muiStyles";
import AddTeamForm from "./AddTeam";
import EditableTeamsTable from "./EditableTeamsTable";
import { useTranslations } from "next-intl";

interface OptimisticTeamsProps {
  teams: CombinedTeam[];
  canCreate: boolean;
}

type OptimisticAction = { type: "add"; team: CombinedTeam };

export default function OptimisticTeams({ teams, canCreate }: OptimisticTeamsProps) {
  const t = useTranslations("teams");

  const [optimisticTeams, addOptimistic] = useOptimistic<CombinedTeam[], OptimisticAction>(
    teams,
    (state, action) => (action.type === "add" ? [...state, action.team] : state),
  );

  const handleOptimisticAdd = (teamName: string) => {
    const now = new Date();
    addOptimistic({
      type: "add",
      team: {
        teamId: crypto.randomUUID(),
        teamName,
        teamManagerId: null,
        managerName: null,
        departmentId: null,
        departmentName: null,
        createdAt: now,
        updatedAt: now,
        members: [],
      },
    });
  };

  return (
    <>
      {canCreate && <AddTeamForm onOptimisticAdd={handleOptimisticAdd} />}
      <Box data-tutorial="teams-table" sx={pageContainerStyles}>
        <Typography variant="h6" mb={1}>
          {t("heading")}
        </Typography>
        <EditableTeamsTable combinedTeams={optimisticTeams} canCreate={canCreate} />
      </Box>
    </>
  );
}
