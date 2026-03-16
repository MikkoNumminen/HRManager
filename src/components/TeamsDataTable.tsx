import React from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';

interface TeamData {
  teamName: string;
  members: {
    name: string;
    email: string;
  }[];
}

interface TeamsDataTableProps {
  teamsData: TeamData[];
}

const TeamsDataTable: React.FC<TeamsDataTableProps> = ({ teamsData }) => {
  return (
    <TableContainer component={Paper} sx={{ marginBottom: '20px' }}>
      <Table sx={{ minWidth: 650 }} aria-label="teams data table">
        <TableHead>
          <TableRow>
            <TableCell>Team Name</TableCell>
            <TableCell>Members</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {teamsData.map((team, index) => (
            <TableRow key={index}>
              <TableCell>{team.teamName}</TableCell>
              <TableCell>
                <Box>
                  {team.members.map((member, idx) => (
                    <Typography key={idx} variant="body2">
                      {member.name} - {member.email}
                    </Typography>
                  ))}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TeamsDataTable;
