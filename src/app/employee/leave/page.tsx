import TopBar from "@/components/TopBar";
import EmployeeLeaveClient from "@/features/employee/components/EmployeeLeaveClient";
import {
  getSelfLeaveBalances,
  getSelfLeaveRequests,
  getLinkedPerson,
} from "@/features/employee/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";
import { Alert, Box } from "@mui/material";

export default async function EmployeeLeavePage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const permissions = await getUserPermissions();
  const t = await getTranslations("employee");

  const linkedPerson = await getLinkedPerson();

  if (!linkedPerson) {
    return (
      <>
        <TopBar title={t("leave")} backHref="/employee" permissions={permissions} />
        <Box sx={{ mt: 2 }}>
          <Alert severity="info">{t("noProfile")}</Alert>
        </Box>
      </>
    );
  }

  const [leaveBalances, leaveRequests] = await Promise.all([
    getSelfLeaveBalances(new Date().getFullYear()),
    getSelfLeaveRequests(),
  ]);

  return (
    <>
      <TopBar title={t("leave")} backHref="/employee" permissions={permissions} />
      <EmployeeLeaveClient leaveBalances={leaveBalances} leaveRequests={leaveRequests} />
    </>
  );
}
