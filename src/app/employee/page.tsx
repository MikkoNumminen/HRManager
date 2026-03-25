import TopBar from "@/components/TopBar";
import EmployeeDashboardClient from "@/components/EmployeeDashboardClient";
import {
  getSelfProfile,
  getSelfLeaveBalances,
  getSelfLeaveRequests,
  getSelfReviews,
} from "@/features/employee/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";
import { Alert, Box } from "@mui/material";

export default async function EmployeePortalPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const permissions = await getUserPermissions();
  const t = await getTranslations("employee");

  const [profile, leaveBalances, leaveRequests, reviews] = await Promise.all([
    getSelfProfile(),
    getSelfLeaveBalances(new Date().getFullYear()),
    getSelfLeaveRequests(),
    getSelfReviews(),
  ]);

  if (!profile) {
    return (
      <>
        <TopBar title={t("title")} backHref="/" permissions={permissions} />
        <Box sx={{ mt: 2 }}>
          <Alert severity="info">{t("noProfile")}</Alert>
        </Box>
      </>
    );
  }

  return (
    <>
      <TopBar title={t("title")} backHref="/" permissions={permissions} />
      <EmployeeDashboardClient
        profile={profile}
        leaveBalances={leaveBalances}
        leaveRequests={leaveRequests}
        reviews={reviews}
      />
    </>
  );
}
