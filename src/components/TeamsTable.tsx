"use client";

import React from "react";
import {
  Avatar,
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { CombinedTeam } from "@/schemas";
import { colors } from "@/muiStyles";
import { useTranslations } from "next-intl";

interface CombinedTeamProps {
  combinedTeams: CombinedTeam[];
  minimal?: boolean;
}

const TeamsTable: React.FC<CombinedTeamProps> = ({ combinedTeams, minimal = false }) => {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  if (minimal) {
    return combinedTeams.length === 0 ? (
      <Typography sx={{ color: colors.slate400, textAlign: "center", py: 2 }}>
        {t("noTeams")}
      </Typography>
    ) : (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {combinedTeams.map((team) => {
          const initials = team.teamName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          return (
            <Chip
              key={team.teamId}
              avatar={
                <Avatar
                  sx={{
                    bgcolor: colors.slate600,
                    color: `${colors.slate100} !important`,
                    fontSize: "0.75rem",
                  }}
                >
                  {initials}
                </Avatar>
              }
              label={team.teamName}
              variant="outlined"
              sx={{
                color: colors.slate100,
                borderColor: colors.slate300,
                "& .MuiChip-label": { fontWeight: 500 },
              }}
            />
          );
        })}
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ marginBottom: "20px" }}>
      <Table sx={{ minWidth: 650, maxWidth: 1020 }} aria-label="teams table">
        <TableHead>
          <TableRow>
            <TableCell>{t("teamName")}</TableCell>
            <TableCell>{t("teamManager")}</TableCell>
            <TableCell>{t("teamMembers")}</TableCell>
            <TableCell>{tc("createdAt")}</TableCell>
            <TableCell>{tc("updatedAt")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {combinedTeams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                  <Typography align="center">{t("noTeams")}</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            combinedTeams.map((team) => (
              <TableRow key={team.teamId}>
                <TableCell>{team.teamName}</TableCell>
                <TableCell>{team.managerName || t("noManager")}</TableCell>
                <TableCell>
                  <Box>
                    {team.members.map((member) => (
                      <Typography key={member.personId} variant="body2">
                        {member.name}
                      </Typography>
                    ))}
                  </Box>
                </TableCell>
                <TableCell>{new Date(team.createdAt).toLocaleString()}</TableCell>
                <TableCell>{new Date(team.updatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TeamsTable;
