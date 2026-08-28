import Footer from "@/components/Footer";
import ArtistApplicationForm from "@/components/artists/ArtistApplicationForm";

export default function ArtistApplyPage() {
  return (
    <main className="artist-apply-page-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section
        className="px-5 pb-[60px] pt-[176px] md:px-8 xl:px-10"
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
            <h1 className="m-0 max-w-[650px] font-[family-name:var(--font-aktiv-grotesk)] text-[72px] font-normal leading-[0.98] tracking-[-0.035em] text-white">
              Join Audioflume as an artist.
            </h1>
            <p className="mb-0 mt-5 max-w-[650px] text-sm leading-6 text-white">
              Create your artist profile and submit it for review. Once approved, this profile will become the home for your catalogue, releases, playlists, and artist tools.
            </p>
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
