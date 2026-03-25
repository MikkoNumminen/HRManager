"use client";

import { EmployeeProfile } from "@/schemas";
import { Alert, Avatar, Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { colors, formStyles } from "@/muiStyles";
import { useTranslations } from "next-intl";
import EmailIcon from "@mui/icons-material/Email";
import BadgeIcon from "@mui/icons-material/Badge";
import GroupsIcon from "@mui/icons-material/Groups";
import StarIcon from "@mui/icons-material/Star";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LockIcon from "@mui/icons-material/Lock";

interface EmployeeSelfProfileClientProps {
  profile: EmployeeProfile;
}

export default function EmployeeSelfProfileClient({ profile }: EmployeeSelfProfileClientProps) {
  const t = useTranslations("employee");

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasLeadership = profile.managedTeams.length > 0 || profile.headOfDepartments.length > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* GDPR notice */}
      <Alert severity="info" icon={<LockIcon fontSize="inherit" />}>
        {t("gdprNotice")}
      </Alert>

      {/* Header card: avatar + name + position + email + hire date */}
      <Box
        sx={{
          ...formStyles,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "center", sm: "flex-start" },
          gap: 3,
          textAlign: { xs: "center", sm: "left" },
        }}
      >
        <Avatar
          sx={{
            width: { xs: 80, sm: 96 },
            height: { xs: 80, sm: 96 },
            fontSize: "2rem",
            fontWeight: 600,
            backgroundColor: colors.slate700,
            color: colors.green400,
            border: `2px solid ${colors.green400}`,
          }}
        >
          {initials}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h4"
            sx={{
              color: colors.slate100,
              fontWeight: 700,
              fontSize: { xs: "1.5rem", sm: "2rem" },
              mb: 0.5,
            }}
          >
            {profile.name}
          </Typography>

          {profile.position && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.5,
                justifyContent: { xs: "center", sm: "flex-start" },
              }}
            >
              <BadgeIcon sx={{ fontSize: "1rem", color: colors.slate400 }} />
              <Typography variant="body1" sx={{ color: colors.slate300 }}>
                {profile.position}
              </Typography>
            </Box>
          )}

          {profile.email && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.5,
                justifyContent: { xs: "center", sm: "flex-start" },
              }}
            >
              <EmailIcon sx={{ fontSize: "1rem", color: colors.slate400 }} />
              <Typography variant="body2" sx={{ color: colors.slate400 }}>
                {profile.email}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              justifyContent: { xs: "center", sm: "flex-start" },
            }}
          >
            <CalendarTodayIcon sx={{ fontSize: "1rem", color: colors.slate400 }} />
            <Typography variant="caption" sx={{ color: colors.slate400 }}>
              {t("hireDate")} {new Date(profile.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Teams section */}
      <Box sx={formStyles}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <GroupsIcon sx={{ color: colors.slate300 }} />
          <Typography variant="h6" sx={{ color: colors.slate100 }}>
            {t("teams")}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: colors.slate300, mb: 1.5 }} />
        {profile.teams.length === 0 ? (
          <Typography variant="body2" sx={{ color: colors.slate400 }}>
            {t("noTeams")}
          </Typography>
        ) : (
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {profile.teams.map((team) => (
              <Chip
                key={team.teamId}
                label={team.teamName}
                variant="outlined"
                sx={{
                  color: colors.slate100,
                  borderColor: colors.slate300,
                  "& .MuiChip-label": { fontWeight: 500 },
                }}
              />
            ))}
          </Stack>
        )}
      </Box>

      {/* Leadership roles section */}
      {hasLeadership && (
        <Box sx={formStyles}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <StarIcon sx={{ color: colors.green400 }} />
            <Typography variant="h6" sx={{ color: colors.slate100 }}>
              {t("leadership")}
            </Typography>
          </Box>
          <Divider sx={{ borderColor: colors.slate300, mb: 1.5 }} />

          {profile.managedTeams.length > 0 && (
            <Box sx={{ mb: profile.headOfDepartments.length > 0 ? 2 : 0 }}>
              <Typography variant="subtitle2" sx={{ color: colors.slate300, mb: 1 }}>
                {t("managedTeams")}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {profile.managedTeams.map((team) => (
                  <Chip
                    key={team.teamId}
                    label={team.teamName}
                    variant="outlined"
                    sx={{
                      color: colors.green400,
                      borderColor: colors.green400,
                      "& .MuiChip-label": { fontWeight: 500 },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {profile.headOfDepartments.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ color: colors.slate300, mb: 1 }}>
                {t("headOfDepartments")}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {profile.headOfDepartments.map((dept) => (
                  <Chip
                    key={dept.id}
                    label={dept.name}
                    variant="outlined"
                    sx={{
                      color: colors.green400,
                      borderColor: colors.green400,
                      "& .MuiChip-label": { fontWeight: 500 },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      )}

      {/* Read-only reminder */}
      <Alert severity="info" sx={{ borderRadius: "4px" }}>
        {t("readOnly")}
      </Alert>
    </Box>
  );
}
