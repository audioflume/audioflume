import Footer from "@/components/Footer";
import ArtistApplicationForm from "@/components/artists/ArtistApplicationForm";

export default function ArtistApplyPage() {
  return (
    <main className="artist-apply-page-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section
        className="px-5 pt-[112px] md:px-8 xl:px-10"
        style={{
          backgroundImage:
            'url("https://images.filmwave.io/images/artist-signup/soundtrap-7pAguituFGo-unsplash-web.jpg")',
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto max-w-[980px]">
          <section className="mb-8 grid gap-6 md:grid-cols-[minmax(0,0.92fr)_minmax(280px,0.62fr)] md:items-end">
            <h1 className="m-0 max-w-[720px] font-[family-name:var(--font-aktiv-grotesk)] text-[56px] font-normal leading-[0.98] tracking-[-0.035em] text-[var(--text-primary)]">
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
