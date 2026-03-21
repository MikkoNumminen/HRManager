"use client";

import React from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Box,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { colors } from "@/muiStyles";
import { CombinedTeam } from "@/schemas";
import { useTranslations } from "next-intl";

interface CombinedTeamProps {
  combinedTeams: CombinedTeam[];
}

const EditableTeamsTable: React.FC<CombinedTeamProps> = ({ combinedTeams }) => {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const router = useRouter();

  const handleRowClick = (teamId: string) => {
    router.push(`/manageTeams/${teamId}`);
  };

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: { xs: 500, sm: 650 } }} aria-label="teams table">
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
              <Tooltip
                key={team.teamId}
                title={t("clickToManage", { name: team.teamName })}
                placement="right"
                arrow
              >
                <TableRow
                  hover
                  onClick={() => handleRowClick(team.teamId)}
                  sx={{
                    "&:hover": {
                      cursor: "pointer",
                      backgroundColor: colors.rowHover,
                    },
                  }}
                >
                  <TableCell>{team.teamName}</TableCell>
                  <TableCell>{team.managerName || t("noManager")}</TableCell>
                  <TableCell>
                    <Box>
                      {team.members && team.members.length > 0
                        ? team.members.map((member) => (
                            <Typography key={member.personId} variant="body2">
                              {member?.name || tc("unknown")}
                            </Typography>
                          ))
                        : null}
                    </Box>
                  </TableCell>
                  <TableCell>{new Date(team.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{new Date(team.updatedAt).toLocaleString()}</TableCell>
                </TableRow>
              </Tooltip>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default EditableTeamsTable;
