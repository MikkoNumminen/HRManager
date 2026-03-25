import TopBar from "@/components/TopBar";
import ReviewTemplateDetailClient from "@/features/reviews/components/ReviewTemplateDetailClient";
import { getReviewTemplate } from "@/features/reviews/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";

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

  return (
    <>
      <TopBar title={template.name} backHref="/reviews/templates" permissions={permissions} />
      <ReviewTemplateDetailClient template={template} />
    </>
  );
}
