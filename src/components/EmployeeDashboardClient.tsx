"use client";

import { EmployeeProfile, LeaveBalance, LeaveRequest, ReviewRequest } from "@/schemas";
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { colors, formStyles } from "@/muiStyles";
import { useTranslations } from "next-intl";
import Link from "next/link";
import PersonIcon from "@mui/icons-material/Person";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import AssessmentIcon from "@mui/icons-material/Assessment";

interface EmployeeDashboardClientProps {
  profile: EmployeeProfile;
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  reviews: ReviewRequest[];
}

export default function EmployeeDashboardClient({
  profile,
  leaveBalances,
  leaveRequests,
  reviews,
}: EmployeeDashboardClientProps) {
  const t = useTranslations("employee");

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const pendingLeave = leaveRequests.filter((r) => r.status === "PENDING").length;
  const pendingReviews = reviews.filter((r) => r.status === "PENDING").length;
  const totalLeaveRemaining = leaveBalances.reduce((sum, b) => sum + b.remaining, 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Welcome card */}
      <Alert severity="info" sx={{ borderRadius: "4px" }}>
        {t("readOnly")}
      </Alert>

      {/* Profile summary */}
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
            width: { xs: 64, sm: 80 },
            height: { xs: 64, sm: 80 },
            fontSize: "1.5rem",
            fontWeight: 600,
            backgroundColor: colors.slate700,
            color: colors.green400,
            border: `2px solid ${colors.green400}`,
          }}
        >
          {initials}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" sx={{ color: colors.slate100, fontWeight: 700, mb: 0.5 }}>
            {profile.name}
          </Typography>
          {profile.position && (
            <Typography variant="body2" sx={{ color: colors.slate300, mb: 0.25 }}>
              {profile.position}
            </Typography>
          )}
          {profile.email && (
            <Typography variant="body2" sx={{ color: colors.slate400 }}>
              {profile.email}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Quick stats */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Card
          sx={{
            flex: 1,
            backgroundColor: colors.slate700,
            border: `1px solid ${colors.slate300}`,
            borderRadius: "4px",
          }}
        >
          <CardActionArea component={Link} href="/employee/leave">
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <BeachAccessIcon sx={{ color: colors.green400, fontSize: "2rem" }} />
              <Box>
                <Typography variant="h4" sx={{ color: colors.slate100, fontWeight: 700 }}>
                  {totalLeaveRemaining}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.slate400 }}>
                  {t("leaveRemaining")}
                </Typography>
                {pendingLeave > 0 && (
                  <Chip
                    label={t("pendingCount", { count: pendingLeave })}
                    size="small"
                    sx={{
                      mt: 0.5,
                      backgroundColor: colors.slate600,
                      color: colors.warning,
                      fontSize: "0.7rem",
                    }}
                  />
                )}
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card
          sx={{
            flex: 1,
            backgroundColor: colors.slate700,
            border: `1px solid ${colors.slate300}`,
            borderRadius: "4px",
          }}
        >
          <CardActionArea component={Link} href="/employee/reviews">
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <AssessmentIcon sx={{ color: colors.green400, fontSize: "2rem" }} />
              <Box>
                <Typography variant="h4" sx={{ color: colors.slate100, fontWeight: 700 }}>
                  {reviews.length}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.slate400 }}>
                  {t("totalReviews")}
                </Typography>
                {pendingReviews > 0 && (
                  <Chip
                    label={t("pendingCount", { count: pendingReviews })}
                    size="small"
                    sx={{
                      mt: 0.5,
                      backgroundColor: colors.slate600,
                      color: colors.warning,
                      fontSize: "0.7rem",
                    }}
                  />
                )}
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card
          sx={{
            flex: 1,
            backgroundColor: colors.slate700,
            border: `1px solid ${colors.slate300}`,
            borderRadius: "4px",
          }}
        >
          <CardActionArea component={Link} href="/employee/profile">
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <PersonIcon sx={{ color: colors.green400, fontSize: "2rem" }} />
              <Box>
                <Typography variant="body1" sx={{ color: colors.slate100, fontWeight: 600 }}>
                  {t("viewProfile")}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.slate400 }}>
                  {t("profileSubtitle")}
                </Typography>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      </Stack>
    </Box>
  );
}
