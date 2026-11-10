import { SignIn } from "@clerk/nextjs";
import { notFound } from "next/navigation";

export default function LegacyClerkSignInPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <SignIn
        routing="path"
        path="/auth-preview/clerk-sign-in"
        forceRedirectUrl="/auth-preview"
        fallbackRedirectUrl="/auth-preview"
      />
    </main>
  );
}
