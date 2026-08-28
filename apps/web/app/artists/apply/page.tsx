import Footer from "@/components/Footer";
import ArtistApplicationForm from "@/components/artists/ArtistApplicationForm";

export default function ArtistApplyPage() {
  return (
    <main className="artist-apply-page-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section
        className="px-5 pb-[80px] pt-[136px] md:px-8 xl:px-10"
        style={{
          backgroundImage:
            'url("https://images.filmwave.io/images/artist-signup/soundtrap-7pAguituFGo-unsplash-web.jpg")',
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto max-w-[650px]">
          <section className="mb-8">
            <h1 className="m-0 max-w-[650px] font-[family-name:var(--font-aktiv-grotesk)] text-[84px] font-normal leading-[0.98] tracking-[-0.035em] text-white">
              Join <span className="font-medium">audioflume</span> as an artist.
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
