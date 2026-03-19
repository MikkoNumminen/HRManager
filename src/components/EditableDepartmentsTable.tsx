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
import { Department } from "@/schemas";

interface EditableDepartmentsTableProps {
  departments: Department[];
}

const EditableDepartmentsTable: React.FC<EditableDepartmentsTableProps> = ({ departments }) => {
  const router = useRouter();

  const handleRowClick = (departmentId: string) => {
    router.push(`/manageDepartments/${departmentId}`);
  };

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650, maxWidth: 1020 }} aria-label="departments table">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Head</TableCell>
            <TableCell>Teams</TableCell>
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
              <Tooltip key={dept.id} title={`Click to manage ${dept.name}`} placement="right" arrow>
                <TableRow
                  hover
                  onClick={() => handleRowClick(dept.id)}
                  sx={{
                    "&:hover": {
                      cursor: "pointer",
                      backgroundColor: colors.rowHover,
                    },
                  }}
                >
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
                        : null}
                    </Box>
                  </TableCell>
                  <TableCell>{new Date(dept.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{new Date(dept.updatedAt).toLocaleString()}</TableCell>
                </TableRow>
              </Tooltip>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default EditableDepartmentsTable;
