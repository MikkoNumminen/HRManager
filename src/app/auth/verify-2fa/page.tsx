import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TwoFactorVerify from "@/components/TwoFactorVerify";

export default async function Verify2FAPage() {
  const session = await auth();

  // If not signed in, redirect to sign-in
  if (!session?.user?.id) redirect("/auth/signin");

  // If 2FA is not required or already verified, redirect to home
  if (!session.user.twoFactorRequired || session.user.twoFactorVerified) {
    redirect("/");
  }

  return <TwoFactorVerify />;
}
