import TopBar from "@/components/TopBar";
import EmployeeReviewsClient from "@/components/EmployeeReviewsClient";
import { getSelfReviews, getLinkedPerson } from "@/features/employee/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";
import { Alert, Box } from "@mui/material";

export default async function EmployeeReviewsPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const permissions = await getUserPermissions();
  const t = await getTranslations("employee");

  const linkedPerson = await getLinkedPerson();

  if (!linkedPerson) {
    return (
      <>
        <TopBar title={t("reviews")} backHref="/employee" permissions={permissions} />
        <Box sx={{ mt: 2 }}>
          <Alert severity="info">{t("noProfile")}</Alert>
        </Box>
      </>
    );
  }

  const reviews = await getSelfReviews();

  return (
    <>
      <TopBar title={t("reviews")} backHref="/employee" permissions={permissions} />
      <EmployeeReviewsClient reviews={reviews} />
    </>
  );
}
