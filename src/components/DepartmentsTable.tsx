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
import { colors, mobileCardStyles } from "@/muiStyles";
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

  const emptyMessage = (
    <Box display="flex" justifyContent="center" alignItems="center" height="100px">
      <Typography align="center">{t("noDepartments")}</Typography>
    </Box>
  );

  return (
    <>
      {/* Desktop: table view */}
      <Box data-testid="table-view" sx={{ display: { xs: "none", md: "block" } }}>
        <TableContainer component={Paper} sx={{ marginBottom: "20px" }}>
          <Table sx={{ minWidth: { xs: 500, sm: 650 } }} aria-label="departments table">
            <TableHead>
              <TableRow>
                <TableCell scope="col">{tc("name")}</TableCell>
                <Tooltip title={t("descriptionTooltip")} placement="top" arrow>
                  <TableCell scope="col" sx={{ cursor: "help" }}>
                    {t("description")}
                  </TableCell>
                </Tooltip>
                <Tooltip title={t("headTooltip")} placement="top" arrow>
                  <TableCell scope="col" sx={{ cursor: "help" }}>
                    {t("head")}
                  </TableCell>
                </Tooltip>
                <Tooltip title={t("teamsTooltip")} placement="top" arrow>
                  <TableCell scope="col" sx={{ cursor: "help" }}>
                    {t("teamsHeader")}
                  </TableCell>
                </Tooltip>
                <TableCell scope="col">{tc("createdAt")}</TableCell>
                <TableCell scope="col">{tc("updatedAt")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>{emptyMessage}</TableCell>
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
      </Box>

      {/* Mobile: card view */}
      <Box data-testid="card-view" sx={{ display: { xs: "block", md: "none" }, mb: 2 }}>
        {departments.length === 0
          ? emptyMessage
          : departments.map((dept) => (
              <Box key={dept.id} sx={mobileCardStyles}>
                <Typography variant="subtitle1" sx={{ color: colors.slate100, fontWeight: 600 }}>
                  {dept.name}
                </Typography>
                {dept.description && (
                  <Typography variant="body2" sx={{ color: colors.slate300 }}>
                    {dept.description}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ color: colors.slate300 }}>
                  {t("head")}: {dept.headName || t("noHead")}
                </Typography>
                {dept.teams.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: colors.slate400 }}>
                      {t("teamsHeader")}:
                    </Typography>
                    {dept.teams.map((team) => (
                      <Typography
                        key={team.teamId}
                        variant="body2"
                        sx={{ color: colors.slate300, pl: 1 }}
                      >
                        {team.teamName}
                      </Typography>
                    ))}
                  </Box>
                )}
                <Typography
                  variant="caption"
                  sx={{ color: colors.slate400, mt: 0.5, display: "block" }}
                >
                  {tc("createdAt")}: {new Date(dept.createdAt).toLocaleString()}
                </Typography>
              </Box>
            ))}
      </Box>
    </>
  );
};

export default DepartmentsTable;
