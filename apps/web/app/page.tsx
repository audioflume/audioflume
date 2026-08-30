import { ListObjectsV2Command } from "@aws-sdk/client-s3";

import { r2Client } from "@/lib/r2";

import HomePageContent from "./HomePageContent";
import PricingHeroImageFlash from "./pricing/PricingHeroImageFlash";
import "./pricing/pricing-page.css";

const DEFAULT_HOME_FLASH_HERO_IMAGE =
  "https://images.filmwave.io/images/home/kyle-loftus-FtQE89f3EXA-unsplash.jpg";
const HOME_FLASH_IMAGE_EXTENSIONS = /\.(avif|jpe?g|png|webp)$/i;

async function listHomeFlashImagesForPrefix(bucket: string, prefix: string) {
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
        Boolean(key) && HOME_FLASH_IMAGE_EXTENSIONS.test(key as string),
    );
}

async function getHomeFlashHeroImages() {
  const bucket =
    process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME ||
    process.env.CLOUDFLARE_R2_BUCKET_NAME ||
    "";
  const publicBaseUrl = (
    process.env.CLOUDFLARE_R2_IMAGES_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    ""
  ).replace(/\/$/, "");

  if (!bucket || !publicBaseUrl) return [DEFAULT_HOME_FLASH_HERO_IMAGE];

  try {
    let keys = await listHomeFlashImagesForPrefix(bucket, "images/pricing/");
    if (keys.length === 0) {
      keys = await listHomeFlashImagesForPrefix(bucket, "pricing/");
    }

    if (keys.length === 0) return [DEFAULT_HOME_FLASH_HERO_IMAGE];

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
    console.error("Failed to load homepage hero images from R2:", error);
    return [DEFAULT_HOME_FLASH_HERO_IMAGE];
  }
}

export default async function Home() {
  const homeHeroImages = await getHomeFlashHeroImages();

  return (
    <>
      <style>{`
        .audioflume-home-flash-hero-media {
          position: absolute;
          top: calc(var(--filmwave-header-height, 75px) + clamp(26px, 3vw, 44px));
          right: 0;
          bottom: 0;
          z-index: 1;
          width: 61%;
          overflow: hidden;
        }

        .audioflume-home-flash-hero-media::after {
          position: absolute;
          inset: 0;
          z-index: 2;
          background: linear-gradient(
            180deg,
            rgba(17, 17, 17, 0.03),
            rgba(17, 17, 17, 0.12)
          );
          content: "";
          pointer-events: none;
        }

        @media (max-width: 980px) {
          .audioflume-home-flash-hero-media {
            width: 67%;
          }
        }

        @media (max-width: 760px) {
          .audioflume-home-flash-hero-media {
            top: calc(var(--filmwave-header-height, 75px) + 70px);
            width: 76%;
          }
        }

        @media (max-width: 520px) {
          .audioflume-home-flash-hero-media {
            width: 82%;
          }
        }
      `}</style>

      <section className="audioflume-pricing-hero">
        <div className="audioflume-pricing-hero-inner">
          <PricingHeroImageFlash images={homeHeroImages} />

          <p className="audioflume-pricing-hero-eyebrow">Audioflume</p>

          <div className="audioflume-pricing-hero-title-stage">
            <h1 className="audioflume-pricing-hero-title">
              <span>More music.</span>
              <span>Less noise.</span>
            </h1>
          </div>

          <div className="audioflume-pricing-hero-bottom">
            <p className="audioflume-pricing-hero-copy">
              Human-curated music and SFX built for filmmakers, with a faster path from the first search to the final edit.
            </p>
            <p className="audioflume-pricing-hero-note">
              Curated for picture, pacing &amp; story.
            </p>
          </div>
        </div>
      </section>

      <HomePageContent />
    </>
  );
}
