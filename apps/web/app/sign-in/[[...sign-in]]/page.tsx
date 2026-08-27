import { SignIn } from "@clerk/nextjs";

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

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl || "/music"}
      />
    </div>
  );
}
