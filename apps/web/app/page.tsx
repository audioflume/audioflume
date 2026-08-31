import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import Link from "next/link";

import {
  playlistDetailActionButtonClass,
  playlistDetailPrimaryActionButtonClass,
} from "@/components/uiClasses";
import { r2Client } from "@/lib/r2";

import HomeEditorialR2Image from "./HomeEditorialR2Image";
import HomePageContent from "./HomePageContent";
import PricingHeroImageFlash from "./pricing/PricingHeroImageFlash";
import "./pricing/pricing-page.css";
import "./home-editorial-refresh.css";

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

        .audioflume-home-flash-hero-copy-stage {
          position: absolute;
          top: var(--filmwave-header-height, 75px);
          right: 0;
          bottom: calc(clamp(34px, 4vw, 58px) + 35.55px);
          left: 0;
          z-index: auto;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
        }

        .audioflume-home-flash-hero-copy-stage .audioflume-pricing-hero-eyebrow {
          position: static;
          margin: 0 0 18px;
        }

        .audioflume-home-flash-hero-copy-stage .audioflume-pricing-hero-title-stage {
          width: 100%;
          margin: 0;
        }

        .audioflume-home-flash-hero-title {
          position: relative;
          z-index: 3;
          width: 92%;
          margin: 0;
          color: var(--filmwave-white);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(62px, 8.4vw, 145px);
          font-weight: 400;
          letter-spacing: -0.055em;
          line-height: 0.82;
          text-transform: uppercase;
          mix-blend-mode: difference;
        }

        .audioflume-home-flash-hero-title span {
          display: block;
        }

        @media (max-width: 980px) {
          .audioflume-home-flash-hero-media {
            width: 67%;
          }

          .audioflume-home-flash-hero-title {
            width: 98%;
            font-size: clamp(60px, 10vw, 102px);
          }
        }

        @media (max-width: 760px) {
          .audioflume-home-flash-hero-media {
            top: calc(var(--filmwave-header-height, 75px) + 70px);
            width: 76%;
          }

          .audioflume-home-flash-hero-copy-stage {
            bottom: calc(184px - 11vw);
          }

          .audioflume-home-flash-hero-title {
            font-size: clamp(50px, 14.6vw, 82px);
            line-height: 0.84;
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

          <div className="audioflume-home-flash-hero-copy-stage">
            <p className="audioflume-pricing-hero-eyebrow">More music, less noise</p>

            <div className="audioflume-pricing-hero-title-stage">
              <h1 className="audioflume-home-flash-hero-title">
                <span>Human curated</span>
                <span>music &amp; SFX</span>
                <span>for film.</span>
              </h1>
            </div>
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

      <section className="audioflume-home-editorial-refresh">
        <div className="audioflume-home-editorial-refresh-inner">
          <div className="audioflume-home-editorial-refresh-main">
            <div className="audioflume-home-editorial-refresh-copy">
              <p className="audioflume-home-editorial-refresh-eyebrow">Built for editors</p>
              <h2 className="audioflume-home-editorial-refresh-heading">
                The right sound. Built for the cut.
              </h2>
              <p className="audioflume-home-editorial-refresh-body">
                Film-forward music and SFX, curated around picture, pacing, and feeling so finding the right audio stays part of the creative process.
              </p>
              <div className="audioflume-home-editorial-refresh-actions">
                <Link
                  href="/music"
                  className={`${playlistDetailPrimaryActionButtonClass} audioflume-home-editorial-refresh-primary-action hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
                >
                  Explore Music
                </Link>
                <Link
                  href="/sound-fx"
                  className={`${playlistDetailActionButtonClass} audioflume-home-editorial-refresh-secondary-action hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
                >
                  Explore SFX
                </Link>
              </div>
            </div>

            <div className="audioflume-home-editorial-refresh-visual" aria-hidden="true">
              <div className="audioflume-home-editorial-refresh-image audioflume-home-editorial-refresh-image-main">
                <HomeEditorialR2Image
                  images={homeHeroImages}
                  startIndex={1}
                  sizes="(max-width: 760px) 78vw, 42vw"
                />
              </div>
              <div className="audioflume-home-editorial-refresh-image audioflume-home-editorial-refresh-image-medium">
                <HomeEditorialR2Image
                  images={homeHeroImages}
                  startIndex={4}
                  sizes="(max-width: 760px) 30vw, 16vw"
                />
              </div>
              <div className="audioflume-home-editorial-refresh-image audioflume-home-editorial-refresh-image-small">
                <HomeEditorialR2Image
                  images={homeHeroImages}
                  startIndex={5}
                  sizes="(max-width: 760px) 25vw, 12vw"
                />
              </div>
            </div>

            <p className="audioflume-home-editorial-refresh-note">
              Curated for picture, pacing &amp; story.
            </p>
          </div>

          <div className="audioflume-home-editorial-refresh-playlists">
            <div className="audioflume-home-editorial-refresh-playlist-visual" aria-hidden="true">
              <div className="audioflume-home-editorial-refresh-playlist-image-main">
                <HomeEditorialR2Image
                  images={homeHeroImages}
                  startIndex={2}
                  sizes="(max-width: 760px) 82vw, 42vw"
                />
              </div>
              <div className="audioflume-home-editorial-refresh-playlist-image-small">
                <HomeEditorialR2Image
                  images={homeHeroImages}
                  startIndex={6}
                  sizes="(max-width: 760px) 30vw, 14vw"
                />
              </div>
            </div>

            <div className="audioflume-home-editorial-refresh-playlist-copy-block">
              <p className="audioflume-home-editorial-refresh-eyebrow">
                Human curated playlists
              </p>
              <h3 className="audioflume-home-editorial-refresh-playlist-heading">
                Playlists built around the scene.
              </h3>
              <p className="audioflume-home-editorial-refresh-playlist-copy">
                Curated by people who understand how music works against picture. Start with the scene, pace, or feeling and get closer to the right track faster.
              </p>
              <Link
                href="/curated-playlists"
                className={`${playlistDetailPrimaryActionButtonClass} audioflume-home-editorial-refresh-playlist-action hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
              >
                Explore Curated Playlists
              </Link>
            </div>
          </div>
        </div>
      </section>

      <HomePageContent />
    </>
  );
}
