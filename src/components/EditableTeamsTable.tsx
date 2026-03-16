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

interface CombinedTeamProps {
  combinedTeams: CombinedTeam[];
}

const EditableTeamsTable: React.FC<CombinedTeamProps> = ({ combinedTeams }) => {
  const router = useRouter();

  const handleRowClick = (teamId: string) => {
    router.push(`/manageTeams/${teamId}`);
  };

  return (
    <TableContainer component={Paper} sx={{ marginBottom: "20px" }}>
      <Table sx={{ minWidth: 650, maxWidth: 1020 }} aria-label="teams table">
        <TableHead>
          <TableRow>
            <TableCell>Team Name</TableCell>
            <TableCell>Team Manager</TableCell>
            <TableCell>Team Members</TableCell>
            <TableCell>Created At</TableCell>
            <TableCell>Updated At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {combinedTeams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  height="100px"
                >
                  <Typography align="center">No Teams Available</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            combinedTeams.map((team) => (
              <Tooltip key={team.teamId} title={`Click to manage ${team.teamName}`} placement="right" arrow>
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
                <TableCell>
                  {team.managerName || "No Manager Assigned"}
                </TableCell>
                <TableCell>
                  <Box>
                    {team.members && team.members.length > 0 ? (
                      team.members.map((member) => (
                        <Typography key={member.email} variant="body2">
                          {member?.name || "Unknown Name"}
                        </Typography>
                      ))
                    ) : null}
                  </Box>
                </TableCell>
                <TableCell>
                  {new Date(team.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {new Date(team.updatedAt).toLocaleString()}
                </TableCell>
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
