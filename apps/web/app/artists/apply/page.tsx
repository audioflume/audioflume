import Link from "next/link";

import Footer from "@/components/Footer";
import ArtistApplicationForm from "@/components/artists/ArtistApplicationForm";

export default function ArtistApplyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="px-5 pt-[112px] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[980px]">
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div className="text-xs text-[var(--text-muted)]">
              Artists / <span className="text-[var(--text-secondary)]">Apply</span>
            </div>
            <Link
              href="/music"
              className="inline-flex h-8 items-center justify-center border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Back to music
            </Link>
          </div>

          <section className="mb-8 grid gap-6 md:grid-cols-[minmax(0,0.92fr)_minmax(280px,0.62fr)] md:items-end">
            <div>
              <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Artist application
              </div>
              <h1 className="max-w-[720px] font-[family-name:var(--font-aktiv-grotesk)] text-[clamp(42px,6vw,72px)] font-medium leading-[0.9] tracking-[-0.07em] text-[var(--text-primary)]">
                Join Audioflume as an artist.
              </h1>
            </div>
            <p className="max-w-[440px] text-sm leading-6 text-[var(--text-secondary)] md:justify-self-end">
              Create your artist profile and submit it for review. Once approved, this profile will become the home for your catalogue, releases, playlists, and artist tools.
            </p>
          </section>

          <ArtistApplicationForm />

          <div className="mt-16 border-t border-[var(--border)] pt-8 pb-[72px]">
            <Footer />
          </div>
        </div>
      </section>
    </main>
  );
}
