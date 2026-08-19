import { SignIn } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

import ArtistClaimPanel from "@/components/artists/ArtistClaimPanel";

export const dynamic = "force-dynamic";

export default async function ArtistClaimPage() {
  const user = await currentUser();

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-[var(--filmwave-page-gutter)] pb-20 pt-[calc(var(--filmwave-header-height)+var(--filmwave-page-gutter))] text-[var(--text-primary)]">
      {user?.id ? (
        <ArtistClaimPanel />
      ) : (
        <div className="flex w-full justify-center">
          <SignIn
            routing="hash"
            forceRedirectUrl="/artists/claim"
            signUpForceRedirectUrl="/artists/claim"
          />
        </div>
      )}
    </main>
  );
}
