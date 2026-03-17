"use client";

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
import { Person } from "@/schemas";
import { colors } from "@/muiStyles";

interface PersonTableProps {
  persons: Person[];
  minimal?: boolean;
}

const PersonTable: React.FC<PersonTableProps> = ({ persons, minimal = false }) => {
  if (minimal) {
    return persons.length === 0 ? (
      <Typography sx={{ color: colors.slate400, textAlign: "center", py: 2 }}>
        No Persons Available
      </Typography>
    ) : (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {persons.map((person) => {
          const initials = person.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          return (
            <Chip
              key={person.id}
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
              label={person.name}
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
      <Table sx={{ minWidth: 650, maxWidth: 1020 }} aria-label="person table">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Position</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Created At</TableCell>
            <TableCell>Updated At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {persons.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                  <Typography align="center">No Persons Available</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            persons.map((person) => (
              <TableRow key={person.id}>
                <TableCell>{person.name}</TableCell>
                <TableCell>{person.position ?? ""}</TableCell>
                <TableCell>{person.email ?? ""}</TableCell>
                <TableCell>{new Date(person.createdAt).toLocaleString()}</TableCell>
                <TableCell>{new Date(person.updatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PersonTable;
