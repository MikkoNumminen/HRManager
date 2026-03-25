import TopBar from "@/components/TopBar";
import ReviewSubmitClient from "@/features/reviews/components/ReviewSubmitClient";
import { getReviewRequestWithTemplate } from "@/features/reviews/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

interface Props {
  params: Promise<{ requestId: string }>;
}

export default async function ReviewSubmitPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["review:submit"]) redirect("/reviews/my-reviews");

  const { requestId } = await params;
  const data = await getReviewRequestWithTemplate(requestId);
  if (!data) redirect("/reviews/my-reviews");

  const t = await getTranslations("reviews");

  return (
    <>
      <TopBar title={t("submitReview")} backHref="/reviews/my-reviews" permissions={permissions} />
      <ReviewSubmitClient request={data.request} template={data.template} />
    </>
  );
}
