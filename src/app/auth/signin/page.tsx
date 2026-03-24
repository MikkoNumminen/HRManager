import SignInClient from "@/components/SignInClient";

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";
  const demoEnabled = process.env.NEXT_PUBLIC_DEMO_LOGIN !== "false";

  return <SignInClient callbackUrl={callbackUrl} demoEnabled={demoEnabled} error={params.error} />;
}
