import Footer from "@/components/Footer";
import ArtistApplicationForm from "@/components/artists/ArtistApplicationForm";

export default function ArtistApplyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="px-5 pt-[112px] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[980px]">
          <ArtistApplicationForm />

          <div className="mt-16 border-t border-[var(--border)] pt-8 pb-[72px]">
            <Footer />
          </div>
        </div>
      </section>
    </main>
  );
}
