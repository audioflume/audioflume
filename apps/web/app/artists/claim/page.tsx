import { SignIn } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

import Footer from "@/components/Footer";
import ArtistClaimPanel from "@/components/artists/ArtistClaimPanel";

export const dynamic = "force-dynamic";

export default async function ArtistClaimPage() {
  const user = await currentUser();

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <style>{`
        html:not(.light):not([data-theme="light"]) .artist-claim-panel-shell {
          box-shadow: none;
        }

        html:not(.light):not([data-theme="light"]) .artist-claim-panel-surface {
          background: #151515;
        }
      `}</style>

      <section className="relative isolate overflow-hidden bg-[#111111] px-5 pb-[120px] pt-[186px] md:px-8 xl:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-1/2 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url("https://images.filmwave.io/images/artist-applications/user_3DEgyNMhV52UyLDrFfXqO4BBTPS/Artist%20Signup%202.png")',
          }}
        />

        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 hidden w-1/2 bg-cover bg-center bg-no-repeat md:block"
          style={{
            backgroundImage:
              'url("https://images.filmwave.io/images/artist-applications/user_3DEgyNMhV52UyLDrFfXqO4BBTPS/Artist%20Signup.png")',
          }}
        />

        <div className="relative mx-auto max-w-[650px]">
          <section className="mb-8">
            <h1 className="relative z-10 m-0 max-w-[650px] font-[family-name:var(--font-aktiv-grotesk)] text-[clamp(56px,5vw,76px)] font-[400] leading-[0.96] tracking-[-0.055em] text-left text-white mix-blend-difference">
              Claim your artist profile
            </h1>
          </section>

          <div className="artist-claim-panel-shell relative z-10">
            {user?.id ? (
              <ArtistClaimPanel />
            ) : (
              <section className="artist-claim-panel-surface overflow-hidden bg-[var(--bg-primary)] p-[50px]">
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
        </div>
      </section>

      <section>
        <Footer showTopBorder={false} />
      </section>
    </main>
  );
}
