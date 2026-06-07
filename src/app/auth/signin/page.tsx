import SignInClient from "@/components/shared/SignInClient";
import { isDemoLoginEnabled } from "@/constants";

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";
  const demoEnabled = isDemoLoginEnabled();

  return <SignInClient callbackUrl={callbackUrl} demoEnabled={demoEnabled} error={params.error} />;
}
