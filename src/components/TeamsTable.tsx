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
import { colors, mobileCardStyles } from "@/muiStyles";
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

  const emptyMessage = (
    <Box display="flex" justifyContent="center" alignItems="center" height="100px">
      <Typography align="center">{t("noTeams")}</Typography>
    </Box>
  );

  return (
    <>
      {/* Desktop: table view */}
      <Box data-testid="table-view" sx={{ display: { xs: "none", md: "block" } }}>
        <TableContainer component={Paper} sx={{ marginBottom: "20px" }}>
          <Table sx={{ minWidth: { xs: 500, sm: 650 } }} aria-label="teams table">
            <TableHead>
              <TableRow>
                <TableCell scope="col">{t("teamName")}</TableCell>
                <TableCell scope="col">{t("teamManager")}</TableCell>
                <TableCell scope="col">{t("teamMembers")}</TableCell>
                <TableCell scope="col">{tc("createdAt")}</TableCell>
                <TableCell scope="col">{tc("updatedAt")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {combinedTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>{emptyMessage}</TableCell>
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
      </Box>

      {/* Mobile: card view */}
      <Box data-testid="card-view" sx={{ display: { xs: "block", md: "none" }, mb: 2 }}>
        {combinedTeams.length === 0
          ? emptyMessage
          : combinedTeams.map((team) => (
              <Box key={team.teamId} sx={mobileCardStyles}>
                <Typography variant="subtitle1" sx={{ color: colors.slate100, fontWeight: 600 }}>
                  {team.teamName}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.slate300 }}>
                  {t("teamManager")}: {team.managerName || t("noManager")}
                </Typography>
                {team.members.length > 0 && (
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
                        {member.name}
                      </Typography>
                    ))}
                  </Box>
                )}
                <Typography
                  variant="caption"
                  sx={{ color: colors.slate400, mt: 0.5, display: "block" }}
                >
                  {tc("createdAt")}: {new Date(team.createdAt).toLocaleString()}
                </Typography>
              </Box>
            ))}
      </Box>
    </>
  );
};

export default TeamsTable;
