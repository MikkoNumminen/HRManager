import React from 'react';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

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
                <ul>
                  {team.members.map((member, idx) => (
                    <li key={idx}>
                      {member.name} - {member.email}
                    </li>
                  ))}
                </ul>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TeamsDataTable;
