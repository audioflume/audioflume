import { ListObjectsV2Command } from "@aws-sdk/client-s3";

import Footer from "@/components/Footer";
import ArtistApplicationForm from "@/components/artists/ArtistApplicationForm";
import { r2Client } from "@/lib/r2";

const DEFAULT_ARTIST_SIGNUP_COLLAGE_IMAGE =
  "https://images.filmwave.io/images/home/kyle-loftus-FtQE89f3EXA-unsplash.jpg";
const ARTIST_SIGNUP_IMAGE_EXTENSIONS = /\.(avif|jpe?g|png|webp)$/i;

async function listArtistSignupImagesForPrefix(bucket: string, prefix: string) {
  const result = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    }),
  );

  return (result.Contents ?? [])
    .map((object) => object.Key)
    .filter(
      (key): key is string =>
        Boolean(key) && ARTIST_SIGNUP_IMAGE_EXTENSIONS.test(key as string),
    );
}

async function getArtistSignupCollageImages() {
  const bucket =
    process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME ||
    process.env.CLOUDFLARE_R2_BUCKET_NAME ||
    "";
  const publicBaseUrl = (
    process.env.CLOUDFLARE_R2_IMAGES_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    ""
  ).replace(/\/$/, "");

  if (!bucket || !publicBaseUrl) return [DEFAULT_ARTIST_SIGNUP_COLLAGE_IMAGE];

  try {
    let keys = await listArtistSignupImagesForPrefix(bucket, "images/pricing/");
    if (keys.length === 0) {
      keys = await listArtistSignupImagesForPrefix(bucket, "pricing/");
    }

    if (keys.length === 0) return [DEFAULT_ARTIST_SIGNUP_COLLAGE_IMAGE];

    return keys
      .sort((a, b) => a.localeCompare(b))
      .map(
        (key) =>
          `${publicBaseUrl}/${key
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/")}`,
      );
  } catch (error) {
    console.error("Failed to load artist signup collage images from R2:", error);
    return [DEFAULT_ARTIST_SIGNUP_COLLAGE_IMAGE];
  }
}

export default async function ArtistApplyPage() {
  const pricingImages = await getArtistSignupCollageImages();
  const collageImages = Array.from(
    { length: 6 },
    (_, index) => pricingImages[index % pricingImages.length],
  );

  return (
    <main className="artist-apply-page-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <style>{`
        .artist-apply-page-root form > section > div:last-child .filmwave-backend-button {
          height: 44px;
          border-radius: 0;
          padding-right: 24px;
          padding-left: 24px;
          font-size: 12px;
          font-weight: 400;
        }
      `}</style>
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
            className="absolute left-[4%] top-[7%] h-[12%] w-[16%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${collageImages[0]}")` }}
          />
          <div
            className="absolute left-[27%] top-[18%] h-[9%] w-[12%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${collageImages[1]}")` }}
          />
          <div
            className="absolute left-[6%] top-[34%] h-[27%] w-[30%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${collageImages[2]}")` }}
          />
          <div
            className="absolute left-[40%] top-[53%] h-[11%] w-[14%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${collageImages[3]}")` }}
          />
          <div
            className="absolute bottom-[9%] left-[13%] h-[14%] w-[18%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${collageImages[4]}")` }}
          />
          <div
            className="absolute bottom-[4%] left-[42%] h-[8%] w-[10%] bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${collageImages[5]}")` }}
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
