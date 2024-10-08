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
  Typography,
  Box,
} from "@mui/material";
import { useRouter } from "next/navigation";

interface CombinedTeam {
  teamName: string;
  teamId: string;
  teamManagerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  members?: {
    name: string;
    email: string;
  }[];
}

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
              <TableRow
                key={team.teamId}
                hover
                onClick={() => handleRowClick(team.teamId)}
                sx={{
                  "&:hover": {
                    cursor: "pointer",
                    backgroundColor: "#f0f0f0", // Change background color on hover
                  },
                }}
              >
                <TableCell>{team.teamName}</TableCell>
                <TableCell>
                  {team.teamManagerId || "No Manager Assigned"}
                </TableCell>
                <TableCell>
                  <ul>
                    {team.members && team.members.length > 0 ? (
                      team.members.map((member, index) => (
                        <li key={`${team.teamId}-${index}`}>
                          {member?.name || "Unknown Name"}
                        </li>
                      ))
                    ) : (
                      <li>-</li>
                    )}
                  </ul>
                </TableCell>
                <TableCell>
                  {new Date(team.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {new Date(team.updatedAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default EditableTeamsTable;
