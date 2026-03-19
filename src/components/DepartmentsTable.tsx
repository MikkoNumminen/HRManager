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
  Tooltip,
  Typography,
} from "@mui/material";
import { Department } from "@/schemas";
import { colors } from "@/muiStyles";

interface DepartmentsTableProps {
  departments: Department[];
  minimal?: boolean;
}

const DepartmentsTable: React.FC<DepartmentsTableProps> = ({ departments, minimal = false }) => {
  if (minimal) {
    return departments.length === 0 ? (
      <Typography sx={{ color: colors.slate400, textAlign: "center", py: 2 }}>
        No Departments Available
      </Typography>
    ) : (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {departments.map((dept) => {
          const initials = dept.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          return (
            <Chip
              key={dept.id}
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
              label={dept.name}
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
      <Table sx={{ minWidth: 650, maxWidth: 1020 }} aria-label="departments table">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <Tooltip title="A short summary of the department's purpose" placement="top" arrow>
              <TableCell sx={{ cursor: "help" }}>Description</TableCell>
            </Tooltip>
            <Tooltip title="The person leading this department" placement="top" arrow>
              <TableCell sx={{ cursor: "help" }}>Head</TableCell>
            </Tooltip>
            <Tooltip title="Teams that belong to this department" placement="top" arrow>
              <TableCell sx={{ cursor: "help" }}>Teams</TableCell>
            </Tooltip>
            <TableCell>Created At</TableCell>
            <TableCell>Updated At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {departments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                  <Typography align="center">No Departments Available</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            departments.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell>{dept.name}</TableCell>
                <TableCell>{dept.description || "-"}</TableCell>
                <TableCell>{dept.headName || "No Head Assigned"}</TableCell>
                <TableCell>
                  <Box>
                    {dept.teams.length > 0
                      ? dept.teams.map((t) => (
                          <Typography key={t.teamId} variant="body2">
                            {t.teamName}
                          </Typography>
                        ))
                      : "-"}
                  </Box>
                </TableCell>
                <TableCell>{new Date(dept.createdAt).toLocaleString()}</TableCell>
                <TableCell>{new Date(dept.updatedAt).toLocaleString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DepartmentsTable;
