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
import { useTranslations } from "next-intl";

interface DepartmentsTableProps {
  departments: Department[];
  minimal?: boolean;
}

const DepartmentsTable: React.FC<DepartmentsTableProps> = ({ departments, minimal = false }) => {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  if (minimal) {
    return departments.length === 0 ? (
      <Typography sx={{ color: colors.slate400, textAlign: "center", py: 2 }}>
        {t("noDepartments")}
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
      <Table sx={{ minWidth: 650 }} aria-label="departments table">
        <TableHead>
          <TableRow>
            <TableCell>{tc("name")}</TableCell>
            <Tooltip title={t("descriptionTooltip")} placement="top" arrow>
              <TableCell sx={{ cursor: "help" }}>{t("description")}</TableCell>
            </Tooltip>
            <Tooltip title={t("headTooltip")} placement="top" arrow>
              <TableCell sx={{ cursor: "help" }}>{t("head")}</TableCell>
            </Tooltip>
            <Tooltip title={t("teamsTooltip")} placement="top" arrow>
              <TableCell sx={{ cursor: "help" }}>{t("teamsHeader")}</TableCell>
            </Tooltip>
            <TableCell>{tc("createdAt")}</TableCell>
            <TableCell>{tc("updatedAt")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {departments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                  <Typography align="center">{t("noDepartments")}</Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            departments.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell>{dept.name}</TableCell>
                <TableCell>{dept.description || tc("dash")}</TableCell>
                <TableCell>{dept.headName || t("noHead")}</TableCell>
                <TableCell>
                  <Box>
                    {dept.teams.length > 0
                      ? dept.teams.map((team) => (
                          <Typography key={team.teamId} variant="body2">
                            {team.teamName}
                          </Typography>
                        ))
                      : tc("dash")}
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
