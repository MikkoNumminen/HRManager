import TopBar from "@/components/TopBar";
import ReportsDashboard from "@/components/ReportsDashboard";
import {
  getHeadcountTrends,
  getTurnoverRates,
  getLeaveUtilization,
  getReviewCompletionRates,
} from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/db";
import { getDemoSessionId } from "@/demoSession";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["reports:view"]) redirect("/");

  const sessionId = await getDemoSessionId();
  const t = await getTranslations("reports");

  const [headcountTrends, turnoverRates, leaveUtilization, reviewCompletion, departments] =
    await Promise.all([
      getHeadcountTrends(),
      getTurnoverRates(),
      getLeaveUtilization(),
      getReviewCompletionRates(),
      prisma.department.findMany({
        where: { deletedAt: null, sessionId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  return (
    <>
      <TopBar title={t("title")} backHref="/" permissions={permissions} />
      <ReportsDashboard
        headcountTrends={headcountTrends}
        turnoverRates={turnoverRates}
        leaveUtilization={leaveUtilization}
        reviewCompletion={reviewCompletion}
        departments={departments}
        canExport={permissions["reports:export"] ?? false}
      />
    </>
  );
}
