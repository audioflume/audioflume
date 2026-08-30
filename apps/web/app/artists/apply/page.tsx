import Footer from "@/components/Footer";
import ArtistApplicationForm from "@/components/artists/ArtistApplicationForm";

const ARTIST_SIGNUP_COLLAGE_IMAGES = [
  "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%204.jpg",
  "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%202.jpg",
  "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%205.jpg",
  "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%208.jpg",
  "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%207.jpg",
];

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

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/2 overflow-hidden md:block"
        >
          <div
            className="absolute left-[7%] top-[10%] h-[15%] w-[23%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${ARTIST_SIGNUP_COLLAGE_IMAGES[0]}")` }}
          />
          <div
            className="absolute right-[8%] top-[22%] h-[24%] w-[31%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${ARTIST_SIGNUP_COLLAGE_IMAGES[1]}")` }}
          />
          <div
            className="absolute left-[12%] top-[43%] h-[32%] w-[38%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${ARTIST_SIGNUP_COLLAGE_IMAGES[2]}")` }}
          />
          <div
            className="absolute right-[16%] top-[61%] h-[17%] w-[21%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${ARTIST_SIGNUP_COLLAGE_IMAGES[3]}")` }}
          />
          <div
            className="absolute bottom-[7%] left-[31%] h-[13%] w-[18%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${ARTIST_SIGNUP_COLLAGE_IMAGES[4]}")` }}
          />
        </div>

        <div className="relative mx-auto max-w-[650px]">
          <section className="mb-8">
            <h1 className="relative z-10 m-0 max-w-[650px] font-[family-name:var(--font-aktiv-grotesk)] text-[80px] font-normal uppercase leading-[0.82] tracking-[-0.035em] text-white mix-blend-difference">
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
