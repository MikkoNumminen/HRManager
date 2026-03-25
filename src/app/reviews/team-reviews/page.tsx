import TopBar from "@/components/TopBar";
import TeamReviewsDashboardClient from "@/components/TeamReviewsDashboardClient";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";
import { getManagerTeamReviews } from "@/features/reviews/queries";
import { prisma } from "@/db";
import { getDemoSessionId } from "@/demoSession";
import { getTranslations } from "next-intl/server";

export default async function TeamReviewsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["review:view"] && !permissions["review:manage"]) redirect("/reviews");

  const t = await getTranslations("reviews");

  // Link logged-in User to Person by email match
  const sessionId = await getDemoSessionId();
  const person = await prisma.person.findFirst({
    where: { email: session.user.email, deletedAt: null, sessionId },
    select: { id: true },
  });

  const teamReviews = person ? await getManagerTeamReviews(person.id) : [];

  return (
    <>
      <TopBar title={t("teamReviewsTitle")} backHref="/reviews" permissions={permissions} />
      <TeamReviewsDashboardClient cycles={teamReviews} />
    </>
  );
}
