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
import { colors, mobileCardClickableStyles } from "@/muiStyles";
import { Department } from "@/schemas";
import { useTranslations } from "next-intl";

interface EditableDepartmentsTableProps {
  departments: Department[];
}

const EditableDepartmentsTable: React.FC<EditableDepartmentsTableProps> = ({ departments }) => {
  const t = useTranslations("departments");
  const tc = useTranslations("common");
  const router = useRouter();

  const handleRowClick = (departmentId: string) => {
    router.push(`/manageDepartments/${departmentId}`);
  };

  const emptyMessage = (
    <Box display="flex" justifyContent="center" alignItems="center" height="100px">
      <Typography align="center">{t("noDepartments")}</Typography>
    </Box>
  );

  return (
    <>
      {/* Desktop: table view */}
      <Box data-testid="table-view" sx={{ display: { xs: "none", md: "block" } }}>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: { xs: 500, sm: 650 } }} aria-label="departments table">
            <TableHead>
              <TableRow>
                <TableCell scope="col">{tc("name")}</TableCell>
                <TableCell scope="col">{t("description")}</TableCell>
                <TableCell scope="col">{t("head")}</TableCell>
                <TableCell scope="col">{t("teamsHeader")}</TableCell>
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
                  <Tooltip
                    key={dept.id}
                    title={t("clickToManage", { name: dept.name })}
                    placement="right"
                    arrow
                  >
                    <TableRow
                      hover
                      tabIndex={0}
                      onClick={() => handleRowClick(dept.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRowClick(dept.id);
                        }
                      }}
                      sx={{
                        "&:hover, &:focus-visible": {
                          cursor: "pointer",
                          backgroundColor: colors.rowHover,
                        },
                      }}
                    >
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
      </Box>

      {/* Mobile: clickable card view */}
      <Box data-testid="card-view" sx={{ display: { xs: "block", md: "none" } }}>
        {departments.length === 0
          ? emptyMessage
          : departments.map((dept) => (
              <Box
                key={dept.id}
                tabIndex={0}
                role="button"
                aria-label={t("clickToManage", { name: dept.name })}
                onClick={() => handleRowClick(dept.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowClick(dept.id);
                  }
                }}
                sx={mobileCardClickableStyles}
              >
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

export default EditableDepartmentsTable;
