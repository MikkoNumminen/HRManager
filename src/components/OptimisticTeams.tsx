"use client";

import { useOptimistic, useState, useMemo } from "react";
import { CombinedTeam } from "@/schemas";
import { Box, Typography } from "@mui/material";
import { pageContainerStyles } from "@/muiStyles";
import AddTeamForm from "./AddTeam";
import EditableTeamsTable from "./EditableTeamsTable";
import SearchBar from "./SearchBar";
import { useTranslations } from "next-intl";

interface OptimisticTeamsProps {
  teams: CombinedTeam[];
  canCreate: boolean;
}

type OptimisticAction = { type: "add"; team: CombinedTeam };

export default function OptimisticTeams({ teams, canCreate }: OptimisticTeamsProps) {
  const t = useTranslations("teams");
  const [search, setSearch] = useState("");

  const [optimisticTeams, addOptimistic] = useOptimistic<CombinedTeam[], OptimisticAction>(
    teams,
    (state, action) => (action.type === "add" ? [...state, action.team] : state),
  );

  const filteredTeams = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return optimisticTeams;
    return optimisticTeams.filter(
      (team) =>
        team.teamName.toLowerCase().includes(q) ||
        (team.managerName && team.managerName.toLowerCase().includes(q)) ||
        (team.departmentName && team.departmentName.toLowerCase().includes(q)) ||
        team.members.some(
          (m) => m.name.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q)),
        ),
    );
  }, [optimisticTeams, search]);

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
        <SearchBar value={search} onChange={setSearch} />
        <EditableTeamsTable combinedTeams={filteredTeams} canCreate={canCreate} />
      </Box>
    </>
  );
}
