import TopBar from "@/components/TopBar";
import MyReviewsClient from "@/features/reviews/components/MyReviewsClient";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function MyReviewsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["review:submit"] && !permissions["review:view"]) redirect("/");

  const t = await getTranslations("reviews");

  return (
    <>
      <TopBar title={t("myReviews")} backHref="/reviews" permissions={permissions} />
      <MyReviewsClient />
    </>
  );
}
