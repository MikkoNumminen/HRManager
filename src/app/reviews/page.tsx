import TopBar from "@/components/TopBar";
import ReviewsClient from "@/features/reviews/components/ReviewsClient";
import { getReviewCycles } from "@/features/reviews/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function ReviewsPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (
    !permissions["review:view"] &&
    !permissions["review:manage"] &&
    !permissions["review:submit"]
  ) {
    redirect("/");
  }

  const cycles = await getReviewCycles();
  const t = await getTranslations("reviews");

  return (
    <>
      <TopBar title={t("title")} backHref="/" permissions={permissions} />
      <ReviewsClient
        cycles={cycles}
        canManage={!!permissions["review:manage"]}
        canSubmit={!!permissions["review:submit"]}
        canView={!!permissions["review:view"] || !!permissions["review:manage"]}
      />
    </>
  );
}
