import { SignIn } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

import Footer from "@/components/Footer";
import ArtistClaimPanel from "@/components/artists/ArtistClaimPanel";

export const dynamic = "force-dynamic";

export default async function ArtistClaimPage() {
  const user = await currentUser();

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="bg-[var(--bg-tertiary)] px-5 pb-[120px] pt-[186px] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[650px]">
          <section className="mb-8">
            <h1 className="m-0 max-w-[650px] font-[family-name:var(--font-aktiv-grotesk)] text-[72px] font-normal leading-[0.98] tracking-[-0.035em] text-[var(--text-primary)]">
              Claim your artist profile
            </h1>
          </section>

          {user?.id ? (
            <ArtistClaimPanel />
          ) : (
            <section className="overflow-hidden rounded-[10px] bg-[var(--bg-primary)] p-[50px]">
              <div className="flex w-full justify-center">
                <SignIn
                  routing="hash"
                  forceRedirectUrl="/artists/claim"
                  signUpForceRedirectUrl="/artists/claim"
                />
              </div>
            </section>
          )}
        </div>
      </section>

      <section>
        <Footer showTopBorder={false} />
      </section>
    </main>
  );
}
