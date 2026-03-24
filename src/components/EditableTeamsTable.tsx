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
import { GroupsOutlined } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { colors, mobileCardClickableStyles } from "@/muiStyles";
import { CombinedTeam } from "@/schemas";
import { useTranslations } from "next-intl";
import EmptyState from "./EmptyState";

interface CombinedTeamProps {
  combinedTeams: CombinedTeam[];
  canCreate?: boolean;
}

const EditableTeamsTable: React.FC<CombinedTeamProps> = ({ combinedTeams, canCreate }) => {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const router = useRouter();

  const handleRowClick = (teamId: string) => {
    router.push(`/manageTeams/${teamId}`);
  };

  const emptyMessage = (
    <EmptyState
      icon={GroupsOutlined}
      title={t("noTeams")}
      subtitle={canCreate ? t("noTeamsHint") : undefined}
    />
  );

  return (
    <>
      {/* Desktop: table view */}
      <Box data-testid="table-view" sx={{ display: { xs: "none", md: "block" } }}>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: { xs: 500, sm: 650 } }} aria-label="teams table">
            <TableHead>
              <TableRow>
                <TableCell scope="col">{t("teamName")}</TableCell>
                <TableCell scope="col">{t("teamManager")}</TableCell>
                <TableCell scope="col">{t("teamMembers")}</TableCell>
                <TableCell scope="col">{tc("createdAt")}</TableCell>
                <TableCell scope="col">{tc("updatedAt")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {combinedTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>{emptyMessage}</TableCell>
                </TableRow>
              ) : (
                combinedTeams.map((team) => (
                  <Tooltip
                    key={team.teamId}
                    title={t("clickToManage", { name: team.teamName })}
                    placement="right"
                    arrow
                  >
                    <TableRow
                      hover
                      tabIndex={0}
                      onClick={() => handleRowClick(team.teamId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRowClick(team.teamId);
                        }
                      }}
                      sx={{
                        "&:hover, &:focus-visible": {
                          cursor: "pointer",
                          backgroundColor: colors.rowHover,
                        },
                      }}
                    >
                      <TableCell>{team.teamName}</TableCell>
                      <TableCell>{team.managerName || t("noManager")}</TableCell>
                      <TableCell>
                        <Box>
                          {team.members && team.members.length > 0
                            ? team.members.map((member) => (
                                <Typography key={member.personId} variant="body2">
                                  {member?.name || tc("unknown")}
                                </Typography>
                              ))
                            : null}
                        </Box>
                      </TableCell>
                      <TableCell>{new Date(team.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{new Date(team.updatedAt).toLocaleString()}</TableCell>
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
        {combinedTeams.length === 0
          ? emptyMessage
          : combinedTeams.map((team) => (
              <Box
                key={team.teamId}
                tabIndex={0}
                role="button"
                aria-label={t("clickToManage", { name: team.teamName })}
                onClick={() => handleRowClick(team.teamId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowClick(team.teamId);
                  }
                }}
                sx={mobileCardClickableStyles}
              >
                <Typography variant="subtitle1" sx={{ color: colors.slate100, fontWeight: 600 }}>
                  {team.teamName}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.slate300 }}>
                  {t("teamManager")}: {team.managerName || t("noManager")}
                </Typography>
                {team.members && team.members.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: colors.slate400 }}>
                      {t("teamMembers")}:
                    </Typography>
                    {team.members.map((member) => (
                      <Typography
                        key={member.personId}
                        variant="body2"
                        sx={{ color: colors.slate300, pl: 1 }}
                      >
                        {member?.name || tc("unknown")}
                      </Typography>
                    ))}
                  </Box>
                )}
                <Typography
                  variant="caption"
                  sx={{ color: colors.slate400, mt: 0.5, display: "block" }}
                >
                  {tc("createdAt")}: {new Date(team.createdAt).toLocaleString()}
                </Typography>
              </Box>
            ))}
      </Box>
    </>
  );
};

export default EditableTeamsTable;
