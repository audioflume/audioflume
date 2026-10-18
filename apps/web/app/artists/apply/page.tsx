import Footer from "@/components/Footer";
import ArtistApplicationForm from "@/components/artists/ArtistApplicationForm";

export default function ArtistApplyPage() {
  return (
    <main className="artist-apply-page-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <style>{`
        .artist-apply-page-root form > section > div:last-child .filmwave-backend-button {
          height: 40px;
          border-radius: 0;
          padding-right: 24px;
          padding-left: 24px;
          font-size: 12px;
          font-weight: 400;
        }

        html:not(.light):not([data-theme="light"]) .artist-application-form-panel {
          background: #151515;
          box-shadow: none;
        }

        .artist-onboarding-hero {
          background: #e5e5dd;
        }

        .artist-onboarding-left-background {
          background: #e5e5dd;
        }

        html:not(.light):not([data-theme="light"]) .artist-onboarding-hero,
        html:not(.light):not([data-theme="light"]) .artist-onboarding-left-background {
          background: #111111;
        }
      `}</style>
      <section className="artist-onboarding-hero relative isolate overflow-hidden px-5 pb-[120px] pt-[120px] md:px-8 xl:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-1/2 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url("https://images.filmwave.io/images/artist-signup/soundtrap-7pAguituFGo-unsplash-web.jpg")',
          }}
        />

        <div
          aria-hidden="true"
          className="artist-onboarding-left-background absolute inset-y-0 left-0 hidden w-1/2 md:block"
        />

        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 hidden w-1/2 bg-cover bg-center bg-no-repeat md:block"
          style={{
            backgroundImage:
              'url("https://images.filmwave.io/images/artist-applications/user_3DEgyNMhV52UyLDrFfXqO4BBTPS/Artist%20Signup.png?v=20261016-2")',
          }}
        />

        <div className="relative mx-auto max-w-[650px]">
          <section className="mb-8">
            <h1 className="relative z-10 m-0 max-w-[650px] font-[family-name:var(--font-aktiv-grotesk)] text-[clamp(56px,5vw,76px)] font-[400] leading-[0.96] tracking-[-0.055em] text-left text-white mix-blend-difference">
              Join Audioflume as an artist.
            </h1>
          </section>

          <div className="relative z-10">
            <ArtistApplicationForm />
          </div>
        </div>
      </section>

      <section>
        <Footer showTopBorder={false} />
      </section>
    </main>
  );
}
