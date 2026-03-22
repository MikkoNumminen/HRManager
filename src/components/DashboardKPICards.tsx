"use client";

import { Box, Typography } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import GroupsIcon from "@mui/icons-material/Groups";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import { colors } from "@/muiStyles";
import { useTranslations } from "next-intl";

interface DashboardKPICardsProps {
  totalPersons: number;
  totalTeams: number;
  totalDepartments: number;
  totalUsers: number;
}

const kpiCardStyles = {
  flex: 1,
  minWidth: { xs: "100%", sm: "calc(50% - 12px)", md: "calc(25% - 12px)" },
  padding: { xs: "16px", sm: "20px" },
  border: `1px solid ${colors.slate300}`,
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  gap: 2,
};

const iconBoxStyles = {
  width: 48,
  height: 48,
  borderRadius: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.hoverOverlay,
};

export default function DashboardKPICards({
  totalPersons,
  totalTeams,
  totalDepartments,
  totalUsers,
}: DashboardKPICardsProps) {
  const t = useTranslations("dashboard");

  const cards = [
    { label: t("persons"), value: totalPersons, icon: <PeopleIcon sx={{ color: colors.info }} /> },
    { label: t("teams"), value: totalTeams, icon: <GroupsIcon sx={{ color: colors.success }} /> },
    {
      label: t("departments"),
      value: totalDepartments,
      icon: <BusinessIcon sx={{ color: colors.warning }} />,
    },
    { label: t("users"), value: totalUsers, icon: <PersonIcon sx={{ color: colors.slate100 }} /> },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1.5,
        mb: 1.5,
      }}
    >
      {cards.map((card) => (
        <Box key={card.label} sx={kpiCardStyles}>
          <Box sx={iconBoxStyles}>{card.icon}</Box>
          <Box>
            <Typography variant="h4" sx={{ color: colors.slate100, fontWeight: 600 }}>
              {card.value}
            </Typography>
            <Typography variant="body2" sx={{ color: colors.slate400 }}>
              {card.label}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
