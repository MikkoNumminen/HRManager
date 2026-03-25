"use client";

import { useOptimistic, useState, useRef } from "react";
import { CombinedTeam } from "@/schemas";
import { Box, Typography, Pagination } from "@mui/material";
import { pageContainerStyles } from "@/muiStyles";
import AddTeamForm from "./AddTeam";
import { EditableTeamsTable } from "./TeamsDataTable";
import SearchBar from "./SearchBar";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PAGE_SIZE } from "@/constants";

interface OptimisticTeamsProps {
  teams: CombinedTeam[];
  total: number;
  page: number;
  search: string;
  canCreate: boolean;
}

type OptimisticAction = { type: "add"; team: CombinedTeam };

export default function OptimisticTeams({
  teams,
  total,
  page,
  search,
  canCreate,
}: OptimisticTeamsProps) {
  const t = useTranslations("teams");
  const router = useRouter();
  const [inputValue, setInputValue] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [optimisticTeams, addOptimistic] = useOptimistic<CombinedTeam[], OptimisticAction>(
    teams,
    (state, action) => (action.type === "add" ? [...state, action.team] : state),
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleSearch(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      params.set("page", "1");
      router.replace(`/manageTeams?${params.toString()}`);
    }, 400);
  }

  function handlePageChange(_e: React.ChangeEvent<unknown>, newPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(newPage));
    router.push(`/manageTeams?${params.toString()}`);
  }

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
        <SearchBar value={inputValue} onChange={handleSearch} />
        <EditableTeamsTable combinedTeams={optimisticTeams} canCreate={canCreate} />
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={handlePageChange} />
          </Box>
        )}
      </Box>
    </>
  );
}
