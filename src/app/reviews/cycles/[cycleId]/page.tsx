import TopBar from "@/components/TopBar";
import ReviewCycleDetailClient from "@/components/ReviewCycleDetailClient";
import { getReviewCycle, getPersons } from "@/queries";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/permissions";

interface Props {
  params: Promise<{ cycleId: string }>;
}

export default async function ReviewCycleDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await getUserPermissions();
  if (!permissions["review:view"] && !permissions["review:manage"]) redirect("/");

  const { cycleId } = await params;
  const cycle = await getReviewCycle(cycleId);
  if (!cycle) redirect("/reviews");

  const persons = await getPersons();
  return (
    <>
      <TopBar title={cycle.name} backHref="/reviews" permissions={permissions} />
      <ReviewCycleDetailClient
        cycle={cycle}
        persons={persons}
        canManage={!!permissions["review:manage"]}
      />
    </>
  );
}
