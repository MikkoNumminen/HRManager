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

  return (
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
              <TableCell colSpan={6}>
                <Box display="flex" justifyContent="center" alignItems="center" height="100px">
                  <Typography align="center">{t("noDepartments")}</Typography>
                </Box>
              </TableCell>
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
  );
};

export default EditableDepartmentsTable;
