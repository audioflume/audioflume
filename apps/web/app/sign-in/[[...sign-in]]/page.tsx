import { SignIn } from "@clerk/nextjs";
import SupabaseAccountAuthForm from "@/components/auth/SupabaseAccountAuthForm";
import { selectAccountAuthProvider } from "@/lib/auth/selectAccountAuthProvider";
import { safeAuthRedirect } from "@/lib/auth/safeAuthRedirect";

type SignInPageProps = {
  searchParams: Promise<{
    redirect_url?: string;
    redirectUrl?: string;
    redirect_url_complete?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectUrl =
    params.redirect_url || params.redirectUrl || params.redirect_url_complete;

  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "supabase") {
    return <SupabaseAccountAuthForm initialMode="sign-in" next={safeAuthRedirect(redirectUrl)} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl || "/discover"}
      />
    </div>
  );
}
