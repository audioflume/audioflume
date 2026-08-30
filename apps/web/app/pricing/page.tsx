import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";
import { playlistDetailPrimaryActionButtonClass } from "@/components/uiClasses";
import { r2Client } from "@/lib/r2";

import PricingHeroImageFlash from "./PricingHeroImageFlash";
import "./pricing-page.css";

export const metadata: Metadata = {
  title: "Pricing | Audioflume",
  description:
    "Audioflume membership pricing for solo filmmakers, active studios, and larger creative teams.",
};

const DEFAULT_PRICING_HERO_IMAGE =
  "https://images.filmwave.io/images/home/kyle-loftus-FtQE89f3EXA-unsplash.jpg";
const PRICING_IMAGE_EXTENSIONS = /\.(avif|jpe?g|png|webp)$/i;

async function listPricingImagesForPrefix(bucket: string, prefix: string) {
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
        Boolean(key) && PRICING_IMAGE_EXTENSIONS.test(key as string),
    );
}

async function getPricingHeroImages() {
  const bucket =
    process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME ||
    process.env.CLOUDFLARE_R2_BUCKET_NAME ||
    "";
  const publicBaseUrl = (
    process.env.CLOUDFLARE_R2_IMAGES_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    ""
  ).replace(/\/$/, "");

  if (!bucket || !publicBaseUrl) return [DEFAULT_PRICING_HERO_IMAGE];

  try {
    let keys = await listPricingImagesForPrefix(bucket, "images/pricing/");
    if (keys.length === 0) {
      keys = await listPricingImagesForPrefix(bucket, "pricing/");
    }

    if (keys.length === 0) return [DEFAULT_PRICING_HERO_IMAGE];

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
    console.error("Failed to load pricing hero images from R2:", error);
    return [DEFAULT_PRICING_HERO_IMAGE];
  }
}

const plans = [
  {
    name: "Starter",
    kicker: "Solo creators",
    price: "$15",
    priceDetail: "CAD / month",
    description:
      "Solo creators building a smaller library of client projects.",
    features: [
      "Full music + SFX catalogue",
      "Royalty-free commercial use",
      "Projects, playlists + favorites",
      "Desktop sync workflow",
    ],
  },
  {
    name: "Studio",
    kicker: "Active filmmakers",
    price: "$39",
    priceDetail: "CAD / month",
    description:
      "For active filmmakers and small teams who need more project coverage.",
    features: [
      "Full music + SFX catalogue",
      "Royalty-free commercial use",
      "More project coverage",
      "Built for active filmmakers + small teams",
    ],
  },
  {
    name: "Enterprise",
    kicker: "Larger teams",
    price: "Custom",
    priceDetail: "Built around usage",
    description:
      "For agencies, publishers, and teams with higher-volume licensing needs.",
    features: [
      "Music + SFX for larger teams",
      "Higher-volume licensing needs",
      "Custom usage terms",
      "Direct support for complex projects",
    ],
  },
] as const;

const includedFeatures = [
  {
    number: "01",
    title: "Human-curated music",
    copy: "A film-forward catalogue shaped around picture, pacing, emotion, and story rather than endless volume.",
  },
  {
    number: "02",
    title: "Sound effects",
    copy: "Music and SFX live in the same workflow, so the search for audio does not become a second job.",
  },
  {
    number: "03",
    title: "Search + organization",
    copy: "Save tracks into projects and playlists, keep favorites close, and get back to the right audio quickly.",
  },
  {
    number: "04",
    title: "Desktop workflow",
    copy: "Keep selected audio close to the edit with Audioflume's connected desktop workflow and local project organization.",
  },
] as const;

export default async function PricingPage() {
  const [{ userId }, pricingHeroImages] = await Promise.all([
    auth(),
    getPricingHeroImages(),
  ]);
  const membershipHref = userId ? "/account/membership" : "/sign-up";
  const membershipLabel = userId ? "Manage membership" : "Get started";

  return (
    <main className="audioflume-pricing-page-root">
      <section className="audioflume-pricing-hero">
        <div className="audioflume-pricing-hero-inner">
          <PricingHeroImageFlash images={pricingHeroImages} />

          <p className="audioflume-pricing-hero-eyebrow">Pricing</p>

          <h1 className="audioflume-pricing-hero-title">
            <span>One library.</span>
            <span>Three ways</span>
            <span>to work.</span>
          </h1>

          <div className="audioflume-pricing-hero-bottom">
            <p className="audioflume-pricing-hero-copy">
              Straightforward access to Audioflume&apos;s curated music and SFX catalogue, with plans for solo filmmakers, active studios, and larger creative teams.
            </p>
            <p className="audioflume-pricing-hero-note">
              Pricing that scales with the work.
            </p>
          </div>
        </div>
      </section>

      <section className="audioflume-pricing-plans-section">
        <div className="audioflume-pricing-section-intro">
          <p className="audioflume-pricing-section-eyebrow">Membership</p>
          <h2 className="audioflume-pricing-section-heading">
            Choose the coverage that fits.
          </h2>
        </div>

        <div className="audioflume-pricing-plan-grid">
          {plans.map((plan) => {
            const isEnterprise = plan.name === "Enterprise";

            return (
              <article key={plan.name} className="audioflume-pricing-plan">
                <p className="audioflume-pricing-plan-kicker">{plan.kicker}</p>
                <h3 className="audioflume-pricing-plan-name">{plan.name}</h3>
                <p className="audioflume-pricing-plan-description">
                  {plan.description}
                </p>

                <div className="audioflume-pricing-plan-price">
                  <strong>{plan.price}</strong>
                  <span>{plan.priceDetail}</span>
                </div>

                <div className="audioflume-pricing-plan-action-row">
                  {isEnterprise ? (
                    <a
                      href="mailto:hello@filmwave.io?subject=Audioflume%20Enterprise"
                      className={`${playlistDetailPrimaryActionButtonClass} audioflume-public-action-button hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
                    >
                      Contact us
                    </a>
                  ) : (
                    <Link
                      href={membershipHref}
                      className={`${playlistDetailPrimaryActionButtonClass} audioflume-public-action-button hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
                    >
                      {membershipLabel}
                    </Link>
                  )}
                </div>

                <ul className="audioflume-pricing-plan-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="audioflume-pricing-includes-section">
        <div>
          <p className="audioflume-pricing-section-eyebrow">Built into Audioflume</p>
          <h2 className="audioflume-pricing-includes-heading">
            Less time managing audio. More time making the edit.
          </h2>
        </div>

        <div className="audioflume-pricing-includes-list">
          {includedFeatures.map((feature) => (
            <div key={feature.number} className="audioflume-pricing-include-row">
              <div className="audioflume-pricing-include-number">
                {feature.number}
              </div>
              <div className="audioflume-pricing-include-title">
                {feature.title}
              </div>
              <p className="audioflume-pricing-include-copy">{feature.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="audioflume-pricing-enterprise-band">
        <div className="audioflume-pricing-enterprise-section">
          <div>
            <p className="audioflume-pricing-section-eyebrow">Enterprise</p>
            <h2 className="audioflume-pricing-enterprise-title">
              Bigger team. Different requirements.
            </h2>
          </div>

          <div className="audioflume-pricing-enterprise-copy">
            <p>
              For agencies, publishers, brands, and larger teams, licensing can be shaped around volume, usage, and the way the organization actually works.
            </p>
            <a
              href="mailto:hello@filmwave.io?subject=Audioflume%20Enterprise"
              className="inline-flex h-[44px] min-w-[240px] items-center justify-center bg-white px-10 text-[13px] font-medium text-[#111111] transition hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none"
            >
              Talk about enterprise
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
