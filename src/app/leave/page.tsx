import TopBar from "@/components/TopBar";
import LeaveManager from "@/components/LeaveManager";
import { getLeaveTypes, getLeaveRequests, getLeaveBalances } from "@/features/leave/queries";
import { getPersons } from "@/features/persons/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function LeavePage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["leave:view"]) redirect("/");

  const t = await getTranslations("leave");
  const [leaveTypes, leaveRequests, leaveBalances, persons] = await Promise.all([
    getLeaveTypes(),
    getLeaveRequests(),
    getLeaveBalances({ year: new Date().getFullYear() }),
    getPersons(),
  ]);

  return (
    <>
      <TopBar title={t("title")} backHref="/" permissions={permissions} />
      <LeaveManager
        leaveTypes={leaveTypes}
        leaveRequests={leaveRequests}
        leaveBalances={leaveBalances}
        persons={persons}
        permissions={permissions}
      />
    </>
  );
}
