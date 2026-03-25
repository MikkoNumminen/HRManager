"use client";

import { Box, Typography, Chip } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import { colors } from "@/muiStyles";
import { nodeColors } from "./orgChartUtils";

export interface OrgChartToolbarProps {
  heading: string;
  totalDepts: number;
  totalTeams: number;
  totalPersons: number;
  departmentsLabel: string;
  teamsLabel: string;
  personsLabel: string;
}

export default function OrgChartToolbar({
  heading,
  totalDepts,
  totalTeams,
  totalPersons,
  departmentsLabel,
  teamsLabel,
  personsLabel,
}: OrgChartToolbarProps) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        px: 2,
        py: 1,
        borderBottom: `1px solid ${colors.slate300}`,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <Typography variant="h6" sx={{ mr: 1 }}>
        {heading}
      </Typography>
      <Chip
        icon={<BusinessIcon sx={{ fontSize: 16 }} />}
        label={`${totalDepts} ${departmentsLabel}`}
        size="small"
        sx={{ borderColor: nodeColors.department, color: nodeColors.department }}
        variant="outlined"
      />
      <Chip
        icon={<GroupsIcon sx={{ fontSize: 16 }} />}
        label={`${totalTeams} ${teamsLabel}`}
        size="small"
        sx={{ borderColor: nodeColors.team, color: nodeColors.team }}
        variant="outlined"
      />
      <Chip
        icon={<PersonIcon sx={{ fontSize: 16 }} />}
        label={`${totalPersons} ${personsLabel}`}
        size="small"
        sx={{ borderColor: nodeColors.person, color: nodeColors.person }}
        variant="outlined"
      />
    </Box>
  );
}
