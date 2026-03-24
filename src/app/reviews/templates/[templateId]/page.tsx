import TopBar from "@/components/TopBar";
import ReviewTemplateDetailClient from "@/components/ReviewTemplateDetailClient";
import { getReviewTemplate } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getTranslations } from "next-intl/server";

interface Props {
  params: Promise<{ templateId: string }>;
}

export default async function ReviewTemplateDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["review:manage"]) redirect("/reviews");

  const { templateId } = await params;
  const template = await getReviewTemplate(templateId);
  if (!template) redirect("/reviews/templates");

  const t = await getTranslations("reviews");

  return (
    <>
      <TopBar title={template.name} backHref="/reviews/templates" permissions={permissions} />
      <ReviewTemplateDetailClient template={template} />
    </>
  );
}
