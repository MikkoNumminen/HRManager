import TopBar from "@/components/TopBar";
import ReviewTemplatesClient from "@/components/ReviewTemplatesClient";
import { getReviewTemplates } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

export default async function ReviewTemplatesPage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["review:manage"]) redirect("/reviews");

  const templates = await getReviewTemplates();
  const t = await getTranslations("reviews");

  return (
    <>
      <TopBar title={t("templatesTitle")} backHref="/reviews" permissions={permissions} />
      <ReviewTemplatesClient templates={templates} />
    </>
  );
}
