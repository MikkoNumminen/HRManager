"use client";

import { Box, Typography, Chip } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { colors } from "@/muiStyles";
import { useTranslations } from "next-intl";
import type {
  DashboardTeamSize,
  DashboardDepartmentSize,
  DashboardGrowthPoint,
  DashboardRecentActivity,
} from "@/schemas";

interface DashboardChartsProps {
  teamSizes: DashboardTeamSize[];
  departmentSizes: DashboardDepartmentSize[];
  growthTimeline: DashboardGrowthPoint[];
  recentActivity: DashboardRecentActivity[];
}

const chartBoxStyles = {
  border: `1px solid ${colors.slate300}`,
  borderRadius: "4px",
  padding: { xs: "16px", sm: "20px" },
};

const chartTextStyles = {
  style: {
    fill: "var(--hrm-slate300)",
    fontSize: 12,
  },
};

const ACTION_COLORS: Record<string, string> = {
  create: "success",
  update: "info",
  delete: "error",
  kickout: "error",
  seed: "warning",
  reset: "warning",
};

export default function DashboardCharts({
  teamSizes,
  departmentSizes,
  growthTimeline,
  recentActivity,
}: DashboardChartsProps) {
  const t = useTranslations("dashboard");
  const ta = useTranslations("audit");

  const actionLabel = (action: string) => {
    const key = `action${action.charAt(0).toUpperCase() + action.slice(1)}` as
      | "actionCreate"
      | "actionUpdate"
      | "actionDelete"
      | "actionSeed"
      | "actionKickout"
      | "actionReset";
    return ta(key);
  };

  const entityLabel = (type: string) => {
    const map: Record<string, string> = {
      person: ta("typePerson"),
      team: ta("typeTeam"),
      teamMember: ta("typeTeamMember"),
      department: ta("typeDepartment"),
      user: ta("typeUser"),
      userPermission: ta("typePermission"),
    };
    return map[type] ?? type;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box sx={{ ...chartBoxStyles, flex: 1, minWidth: { xs: "100%", md: "calc(50% - 12px)" } }}>
          <Typography variant="h6" sx={{ color: colors.slate100, mb: 2 }}>
            {t("membersPerTeam")}
          </Typography>
          {teamSizes.length > 0 ? (
            <BarChart
              xAxis={[
                {
                  scaleType: "band",
                  data: teamSizes.map((ts) => ts.teamName),
                  tickLabelStyle: chartTextStyles.style,
                },
              ]}
              yAxis={[{ tickLabelStyle: chartTextStyles.style }]}
              series={[
                {
                  data: teamSizes.map((ts) => ts.memberCount),
                  color: "var(--hrm-info)",
                  label: t("members"),
                },
              ]}
              height={300}
              sx={{
                "& .MuiChartsLegend-label": { fill: "var(--hrm-slate300) !important" },
              }}
            />
          ) : (
            <Typography sx={{ color: colors.slate400 }}>{t("noData")}</Typography>
          )}
        </Box>

        <Box sx={{ ...chartBoxStyles, flex: 1, minWidth: { xs: "100%", md: "calc(50% - 12px)" } }}>
          <Typography variant="h6" sx={{ color: colors.slate100, mb: 2 }}>
            {t("teamsPerDepartment")}
          </Typography>
          {departmentSizes.length > 0 ? (
            <PieChart
              series={[
                {
                  data: departmentSizes.map((ds, i) => ({
                    id: i,
                    value: ds.teamCount,
                    label: ds.departmentName,
                  })),
                  innerRadius: 30,
                  paddingAngle: 2,
                  cornerRadius: 4,
                },
              ]}
              height={300}
              sx={{
                "& .MuiChartsLegend-label": { fill: "var(--hrm-slate300) !important" },
              }}
            />
          ) : (
            <Typography sx={{ color: colors.slate400 }}>{t("noData")}</Typography>
          )}
        </Box>
      </Box>

      {growthTimeline.length > 0 && (
        <Box sx={chartBoxStyles}>
          <Typography variant="h6" sx={{ color: colors.slate100, mb: 2 }}>
            {t("organizationGrowth")}
          </Typography>
          <LineChart
            xAxis={[
              {
                scaleType: "band",
                data: growthTimeline.map((g) => g.date),
                tickLabelStyle: chartTextStyles.style,
              },
            ]}
            yAxis={[{ tickLabelStyle: chartTextStyles.style }]}
            series={[
              {
                data: growthTimeline.map((g) => g.persons),
                label: t("persons"),
                color: "var(--hrm-info)",
              },
              {
                data: growthTimeline.map((g) => g.teams),
                label: t("teams"),
                color: "var(--hrm-success)",
              },
              {
                data: growthTimeline.map((g) => g.departments),
                label: t("departments"),
                color: "var(--hrm-warning)",
              },
            ]}
            height={300}
            sx={{
              "& .MuiChartsLegend-label": { fill: "var(--hrm-slate300) !important" },
            }}
          />
        </Box>
      )}

      <Box sx={chartBoxStyles}>
        <Typography variant="h6" sx={{ color: colors.slate100, mb: 2 }}>
          {t("recentActivity")}
        </Typography>
        {recentActivity.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {recentActivity.map((entry, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  py: 0.5,
                  borderBottom:
                    i < recentActivity.length - 1 ? `1px solid ${colors.hoverOverlay}` : "none",
                }}
              >
                <Chip
                  label={actionLabel(entry.action)}
                  size="small"
                  color={
                    (ACTION_COLORS[entry.action] as "success" | "info" | "error" | "warning") ??
                    "default"
                  }
                  sx={{ minWidth: 70 }}
                />
                <Typography variant="body2" sx={{ color: colors.slate300 }}>
                  {entityLabel(entry.entityType)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: colors.slate400, ml: "auto", whiteSpace: "nowrap" }}
                >
                  {entry.userEmail ?? t("system")}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ color: colors.slate400 }}>{t("noActivity")}</Typography>
        )}
      </Box>
    </Box>
  );
}
