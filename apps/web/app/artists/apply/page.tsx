import Footer from "@/components/Footer";
import ArtistApplicationForm from "@/components/artists/ArtistApplicationForm";

export default function ArtistApplyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="px-5 pt-[112px] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[980px]">
          <section className="mb-8 grid gap-6 md:grid-cols-[minmax(0,0.92fr)_minmax(280px,0.62fr)] md:items-end">
            <h1 className="m-0 max-w-[720px] font-[family-name:var(--font-aktiv-grotesk)] text-[56px] font-normal leading-[0.98] tracking-[-0.035em] text-[var(--text-primary)]">
              Join Audioflume as an artist.
            </h1>
            <p className="m-0 max-w-[440px] text-sm leading-6 text-[var(--text-secondary)] md:justify-self-end">
              Create your artist profile and submit it for review. Once approved, this profile will become the home for your catalogue, releases, playlists, and artist tools.
            </p>
          </section>

          <ArtistApplicationForm />
        </div>

        <div
          className="mx-auto mt-16 pb-[72px]"
          style={{
            width:
              "calc(100% - var(--filmwave-editorial-inset) - var(--filmwave-editorial-inset))",
            maxWidth: "var(--filmwave-editorial-max-width)",
          }}
        >
          <Footer pageGutter={false} />
        </div>
      </section>
    </main>
  );
}
