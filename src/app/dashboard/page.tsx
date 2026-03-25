import TopBar from "@/components/TopBar";
import DashboardKPICards from "@/features/dashboard/components/DashboardKPICards";
import DashboardCharts from "@/features/dashboard/components/DashboardCharts";
import { getDashboardMetrics } from "@/features/dashboard/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["dashboard:view"]) redirect("/");

  const metrics = await getDashboardMetrics();
  const t = await getTranslations("dashboard");

  return (
    <>
      <TopBar title={t("title")} backHref="/" permissions={permissions} />
      <DashboardKPICards
        totalPersons={metrics.totalPersons}
        totalTeams={metrics.totalTeams}
        totalDepartments={metrics.totalDepartments}
        totalUsers={metrics.totalUsers}
      />
      <DashboardCharts
        teamSizes={metrics.teamSizes}
        departmentSizes={metrics.departmentSizes}
        growthTimeline={metrics.growthTimeline}
        recentActivity={metrics.recentActivity}
      />
    </>
  );
}
