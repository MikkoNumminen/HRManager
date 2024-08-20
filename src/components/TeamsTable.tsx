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

interface CombinedTeam {
  teamName: string;
  teamId: string;
  teamManagerId: string;
  createdAt: Date;
  updatedAt: Date;
  members: {
    name: string;
    email: string;
  }[];
}

interface CombinedTeamProps {
  combinedTeams: CombinedTeam[];
}

const TeamsTable: React.FC<CombinedTeamProps> = ({ combinedTeams }) => {
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
              <TableRow key={team.teamId}>
                <TableCell>{team.teamName}</TableCell>
                <TableCell>{team.teamManagerId}</TableCell>
                <TableCell>
                  <ul>
                    {team.members.map((member) => (
                      <li key={`${team.teamId}-${member.name}`}>
                        {member.name}
                      </li>
                    ))}
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

export default TeamsTable;
