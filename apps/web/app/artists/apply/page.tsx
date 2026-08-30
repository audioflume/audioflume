import Footer from "@/components/Footer";
import ArtistApplicationForm from "@/components/artists/ArtistApplicationForm";

export default function ArtistApplyPage() {
  return (
    <main className="artist-apply-page-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="relative isolate overflow-hidden bg-[#111111] px-5 pb-[120px] pt-[186px] md:px-8 xl:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-1/2 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url("https://images.filmwave.io/images/artist-signup/soundtrap-7pAguituFGo-unsplash-web.jpg")',
          }}
        />

        <div className="relative z-10 mx-auto max-w-[650px]">
          <section className="mb-8">
            <h1 className="m-0 max-w-[650px] font-[family-name:var(--font-aktiv-grotesk)] text-[80px] font-normal uppercase leading-[0.82] tracking-[-0.035em] text-white mix-blend-difference">
              Join Audioflume as an artist.
            </h1>
          </section>

          <ArtistApplicationForm />
        </div>
      </section>

      <section>
        <Footer showTopBorder={false} />
      </section>
    </main>
  );
}
