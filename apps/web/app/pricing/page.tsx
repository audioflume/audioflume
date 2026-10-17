import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import Footer from "@/components/Footer";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import { playlistDetailPrimaryActionButtonClass } from "@/components/uiClasses";
import { r2Client } from "@/lib/r2";

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
    priceDetail: "",
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

const planComparisonRows = [
  {
    label: "Full music catalogue",
    starter: true,
    studio: true,
    enterprise: true,
  },
  {
    label: "Full SFX catalogue",
    starter: true,
    studio: true,
    enterprise: true,
  },
  {
    label: "Royalty-free commercial use",
    starter: true,
    studio: true,
    enterprise: true,
  },
  {
    label: "Projects, playlists + favorites",
    starter: true,
    studio: true,
    enterprise: true,
  },
  {
    label: "Desktop sync workflow",
    starter: true,
    studio: true,
    enterprise: true,
  },
  {
    label: "Expanded project coverage",
    starter: false,
    studio: true,
    enterprise: true,
  },
  {
    label: "Higher-volume licensing",
    starter: false,
    studio: false,
    enterprise: true,
  },
  {
    label: "Custom usage terms",
    starter: false,
    studio: false,
    enterprise: true,
  },
  {
    label: "Direct support for complex projects",
    starter: false,
    studio: false,
    enterprise: true,
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

function PlanStatus({ included }: { included: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{
        color: included
          ? "var(--text-primary)"
          : "color-mix(in srgb, var(--text-primary) 22%, transparent)",
      }}
      aria-label={included ? "Included" : "Not included"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M6.8 10.1 9 12.3l4.4-4.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default async function PricingPage() {
  const [{ userId }, pricingHeroImages] = await Promise.all([
    auth(),
    getPricingHeroImages(),
  ]);
  const membershipHref = userId ? "/account/membership" : "/sign-up";
  const membershipLabel = userId ? "Manage membership" : "Get started";
  const enterpriseImage = pricingHeroImages[2] ?? pricingHeroImages[0];

  return (
    <main className="audioflume-pricing-page-root">
      <section className="audioflume-pricing-plans-section">
        <div className="audioflume-pricing-overview">
          <div className="audioflume-pricing-overview-heading">
            <span className="audioflume-pricing-overview-eyebrow">
              Choose your plan
            </span>
            <h1>Plans &amp; Pricing</h1>
          </div>
          <p>
            Straightforward access to Audioflume&apos;s curated music and SFX
            catalogue, with plans for solo filmmakers, active studios, and
            larger creative teams.
          </p>
        </div>

        <div className="audioflume-pricing-plan-grid">
          {plans.map((plan, index) => {
            const isEnterprise = plan.name === "Enterprise";
            const planImage =
              plan.name === "Enterprise"
                ? "https://images.filmwave.io/images/home/thomas-kinto-qYqbehR-wSI-unsplash.jpg"
                : pricingHeroImages[index] ??
                  pricingHeroImages[0] ??
                  DEFAULT_PRICING_HERO_IMAGE;

            return (
              <article key={plan.name} className="audioflume-pricing-plan">
                <Image
                  src={planImage}
                  alt=""
                  fill
                  sizes="(max-width: 980px) 100vw, 33vw"
                  className="audioflume-pricing-plan-background"
                  aria-hidden="true"
                />
                <span
                  className="audioflume-pricing-plan-overlay"
                  aria-hidden="true"
                />
                <p className="audioflume-pricing-plan-kicker">{plan.kicker}</p>
                <h3 className="audioflume-pricing-plan-name">{plan.name}</h3>
                <p className="audioflume-pricing-plan-description">
                  {plan.description}
                </p>

                <div className="audioflume-pricing-plan-price">
                  <strong>{plan.price}</strong>
                  {plan.priceDetail ? <span>{plan.priceDetail}</span> : null}
                </div>

                <div className="audioflume-pricing-plan-action-row">
                  {isEnterprise ? (
                    <a
                      href="mailto:hello@filmwave.io?subject=Audioflume%20Enterprise"
                      className={`${playlistDetailPrimaryActionButtonClass} audioflume-public-action-button hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
                      style={{ fontSize: "14px", fontWeight: 400 }}
                    >
                      Contact us
                    </a>
                  ) : (
                    <Link
                      href={membershipHref}
                      className={`${playlistDetailPrimaryActionButtonClass} audioflume-public-action-button hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
                      style={{ fontSize: "14px", fontWeight: 400 }}
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

        <section className="audioflume-pricing-lifetime-section">
          <div className="audioflume-pricing-comparison-heading">
            <span>Lifetime Originals</span>
            <Link href="/music?artist=Audioflume">Explore Original Music</Link>
          </div>

          <div className="audioflume-pricing-lifetime">
            <Image
            src="https://images.filmwave.io/images/pricing/andrey-strizhkov-sehwu2FbcHg-unsplash-web.jpg"
            alt=""
            fill
            sizes="(max-width: 980px) 100vw, 100vw"
            className="audioflume-pricing-lifetime-background"
            aria-hidden="true"
          />
          <span
            className="audioflume-pricing-lifetime-overlay"
            aria-hidden="true"
          />
          <div className="audioflume-pricing-lifetime-copy">
            <div className="audioflume-pricing-lifetime-title">
              <span>Lifetime Access to</span>
              <strong>Audioflume Originals</strong>
            </div>
            <p className="audioflume-pricing-plan-description">
              For active filmmakers and small teams who need more
            </p>
          </div>

          <div className="audioflume-pricing-lifetime-offer">
            <h2 className="audioflume-pricing-plan-name">Lifetime Access</h2>
            <div className="audioflume-pricing-lifetime-pricing">
              <div className="audioflume-pricing-lifetime-price-group is-regular">
                <span className="audioflume-pricing-lifetime-badge">Regular price</span>
                <div className="audioflume-pricing-plan-price">
                  <strong>$199</strong>
                </div>
              </div>
              <div className="audioflume-pricing-lifetime-price-group">
                <span className="audioflume-pricing-lifetime-badge is-light">Limited time</span>
                <div className="audioflume-pricing-plan-price">
                  <strong>$99</strong>
                  <span>One time payment</span>
                </div>
              </div>
            </div>
          </div>

          <div className="audioflume-pricing-lifetime-action">
            <Link
              href={membershipHref}
              className={`${playlistDetailPrimaryActionButtonClass} audioflume-public-action-button hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
              style={{ fontSize: "14px", fontWeight: 400 }}
            >
              {membershipLabel}
            </Link>
          </div>
          </div>
        </section>

        <section className="audioflume-pricing-comparison-section">
          <div className="audioflume-pricing-comparison-heading">
            <span>Plan Comparison</span>
            <Link href="/artists/licensing">View licensing details</Link>
          </div>
          <div className="audioflume-pricing-comparison-block">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="border-b-[1.25px] border-[var(--border)]">
                  <th className="w-[34%] pb-8 pr-8 text-left align-top" scope="col">
                    <p className="audioflume-pricing-section-eyebrow mb-1">
                      Flexible Licensing Options
                    </p>
                    <h2 className="mt-[29px] max-w-none whitespace-nowrap font-[family-name:var(--font-aktiv-grotesk)] text-[clamp(28px,2.5vw,36px)] font-normal leading-[0.94] tracking-[-0.035em]">
                      Compare these plans.
                    </h2>
                  </th>
                  {plans.map((plan, index) => (
                    <th
                      key={plan.name}
                      className={`w-[22%] px-5 pb-8 text-center align-top${index > 0 ? " border-l-[1.25px] border-[var(--border)]" : ""}`}
                      scope="col"
                    >
                      <p className="audioflume-pricing-plan-name">{plan.name}</p>
                      <div className="mt-3 audioflume-pricing-include-title">
                        {plan.price}
                        {plan.priceDetail ? ` ${plan.priceDetail}` : ""}
                      </div>
                      <p className="audioflume-pricing-include-copy mx-auto mt-2 max-w-[190px]">
                        {plan.kicker}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planComparisonRows.map((row) => (
                  <tr key={row.label} className="border-b-[1.25px] border-[var(--border)] last:border-b-0">
                    <th className="py-6 pr-8 text-left" scope="row">
                      <div className="audioflume-pricing-include-title">
                        {row.label}
                      </div>
                    </th>
                    <td className="px-5 py-6 text-center">
                      <PlanStatus included={row.starter} />
                    </td>
                    <td className="border-l-[1.25px] border-[var(--border)] px-5 py-6 text-center">
                      <PlanStatus included={row.studio} />
                    </td>
                    <td className="border-l-[1.25px] border-[var(--border)] px-5 py-6 text-center">
                      <PlanStatus included={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </section>
      </section>

      <section className="group/pricing-testimonials relative overflow-hidden bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
        <div
          className="pointer-events-none absolute left-8 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition group-hover/pricing-testimonials:opacity-100 sm:flex"
          aria-hidden="true"
        >
          <ChevronLeftIcon size={18} />
        </div>

        <div
          className="pointer-events-none absolute right-8 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition group-hover/pricing-testimonials:opacity-100 sm:flex"
          aria-hidden="true"
        >
          <ChevronRightIcon size={18} />
        </div>

        <div className="mx-auto w-[calc(100%-var(--filmwave-editorial-inset)-var(--filmwave-editorial-inset))] max-w-[var(--filmwave-editorial-max-width)] py-[clamp(84px,8vw,126px)]">
          <div className="mx-auto max-w-[900px] text-left">
            <p className="m-0 font-[family-name:var(--font-aktiv-grotesk)] text-[14.5px] font-light uppercase leading-none tracking-[0.04em] text-[var(--text-muted)]">
              Testimonials
            </p>
            <blockquote className="mt-7 max-w-none font-[family-name:var(--font-aktiv-grotesk)] text-[clamp(16px,1.45vw,20px)] font-light leading-[1.35] tracking-normal">
              “Add a longer filmmaker testimonial here that speaks to the quality of the music, the speed of finding the right track, and how Audioflume helps keep the editing process focused, creative, and moving without unnecessary friction.”
            </blockquote>
            <div className="mt-7">
              <div className="text-[16px] font-medium leading-[1.2]">Filmmaker name</div>
              <div className="mt-1 text-[13px] font-light leading-[1.35] text-[var(--text-secondary)]">
                Role / Studio
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="audioflume-pricing-includes-section">
        <div>
          <p className="audioflume-home-eyebrow">Built into Audioflume</p>
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
          <div className="audioflume-pricing-enterprise-heading">
            <div className="audioflume-pricing-enterprise-media" aria-hidden="true">
              <Image
                src={enterpriseImage}
                alt=""
                fill
                sizes="(max-width: 760px) 76vw, 38vw"
                className="audioflume-pricing-enterprise-image"
              />
            </div>
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
              className="inline-flex h-[44px] min-w-[240px] items-center justify-center bg-white px-10 text-[14px] font-normal text-[#111111] transition hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none"
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
