import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";
import { playlistDetailPrimaryActionButtonClass } from "@/components/uiClasses";

export const metadata: Metadata = {
  title: "Artist Earnings | Audioflume",
  description:
    "A transparent look at how artists earn through Audioflume subscription, premium licensing, bespoke commissions, and larger licensing opportunities.",
};

const earningModels = [
  {
    number: "01",
    title: "Subscription catalogue",
    split: "Shared Payout Pool",
    description:
      "Membership revenue helps run Audioflume and funds a shared artist payout pool. Each month, your share of that pool is based on your eligible downloads as a percentage of total eligible catalogue downloads. If your music accounts for 5% of eligible downloads, you receive 5% of the pool. Exact eligibility rules are set out in the artist agreement.",
    example: "Your eligible downloads ÷ total eligible downloads = your share of the monthly pool",
  },
  {
    number: "02",
    title: "Premium licensing",
    split: "90% Artist / 10% Audioflume",
    description:
      "Premium tracks are licensed outside the subscription catalogue. Audioflume handles the transaction, with 90% of the standard license amount going to the artist and 10% retained by Audioflume.",
    example: "$500 license → $450 artist / $50 Audioflume",
  },
  {
    number: "03",
    title: "Bespoke commissions",
    split: "85% Artist / 15% Audioflume",
    description:
      "For custom project work, Audioflume can connect artists with filmmakers or brands and help manage the commission. The artist receives 85% of the commission amount and Audioflume retains 15%.",
    example: "$2,000 commission → $1,700 artist / $300 Audioflume",
  },
];

export default function ArtistEarningsPage() {
  return (
    <main className="artist-earnings-page-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="px-5 pt-[158px] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[980px]">
          <section className="mb-16 grid gap-8 md:grid-cols-[70px_minmax(180px,0.7fr)_minmax(0,1.3fr)] md:items-end">
            <div className="md:col-span-2">
              <div className="mb-[18px] text-[14.5px] font-[300] uppercase leading-none tracking-[0.04em] text-[var(--text-muted)]">
                Artist earnings
              </div>
              <h1 className="font-[family-name:var(--font-aktiv-grotesk)] text-[clamp(42px,5vw,60px)] font-normal leading-[0.9] tracking-[-0.035em] text-[var(--text-primary)]">
                More than one way to earn.
              </h1>
            </div>
            <p className="m-0 text-[clamp(16px,1.45vw,20px)] font-[300] leading-[1.35] tracking-normal text-[var(--text-primary)]">
              Audioflume combines subscription discovery with direct licensing and custom work. The goal is to make music easy to find without flattening every use into the same royalty rate.
            </p>
          </section>

          <section className="border-t border-[var(--border)]">
            {earningModels.map((model) => (
              <article
                key={model.number}
                className="grid gap-6 border-b border-[var(--border)] py-8 md:grid-cols-[70px_minmax(180px,0.7fr)_minmax(0,1.3fr)] md:gap-8 md:py-10"
              >
                <div className="grid h-[70px] w-[70px] self-start place-items-center bg-[color-mix(in_srgb,var(--text-primary)_10%,var(--bg-primary))] text-center font-[family-name:var(--font-roboto-mono-filmwave)] text-[28px] font-[300] leading-none text-[var(--filmwave-white)]">
                  {model.number}
                </div>
                <div>
                  <h2 className="m-0 font-[family-name:var(--font-aktiv-grotesk)] text-[24px] font-normal leading-[1] tracking-[-0.035em] text-[var(--text-primary)]">
                    {model.title}
                  </h2>
                  <div className="mt-3 text-[12px] font-normal tracking-normal text-[var(--text-secondary)]">
                    {model.split}
                  </div>
                </div>
                <div>
                  <p className="m-0 text-[14.5px] font-[300] leading-6 text-[var(--text-secondary)]">
                    {model.description}
                  </p>
                  <div className="mt-5 pt-4 font-[family-name:var(--font-roboto-mono)] text-[12px] leading-5 text-[var(--text-primary)]">
                    {model.example}
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="grid gap-8 border-b border-[var(--border)] py-12 md:grid-cols-[minmax(200px,0.7fr)_minmax(0,1.3fr)]">
            <div>
              <div className="mb-[18px] text-[14.5px] font-[300] uppercase leading-none tracking-[0.04em] text-[var(--text-muted)]">
                Larger opportunities
              </div>
              <h2 className="m-0 max-w-[300px] font-[family-name:var(--font-aktiv-grotesk)] text-[32px] font-normal leading-[0.96] tracking-[-0.035em] text-[var(--text-primary)]">
                Enterprise licensing is deal-specific.
              </h2>
            </div>
            <div className="max-w-[560px] md:justify-self-end">
              <p className="m-0 text-[14.5px] font-[300] leading-6 text-[var(--text-secondary)]">
                National campaigns, large-scale commercial uses and unusual licensing requests do not always fit a standard rate. When an opportunity falls outside the normal premium structure, the commercial terms are presented before the deal moves forward rather than being hidden behind a generic royalty calculation.
              </p>
            </div>
          </section>

          <section className="grid gap-8 border-b border-[var(--border)] py-12 md:grid-cols-[minmax(200px,0.7fr)_minmax(0,1.3fr)]">
            <div>
              <div className="mb-[18px] text-[14.5px] font-[300] uppercase leading-none tracking-[0.04em] text-[var(--text-muted)]">
                Transparency
              </div>
              <h2 className="m-0 max-w-[320px] font-[family-name:var(--font-aktiv-grotesk)] text-[32px] font-normal leading-[0.96] tracking-[-0.035em] text-[var(--text-primary)]">
                Clear numbers, before and after the license.
              </h2>
            </div>
            <div className="w-full max-w-[560px] border-t border-[var(--border)] md:justify-self-end md:border-t-0">
              {[
                ["Before a deal", "The applicable split or commercial terms are made clear before a non-standard opportunity proceeds."],
                ["After a deal", "Recorded earnings are broken out by source in the artist dashboard so subscription, premium, bespoke and other earnings stay identifiable."],
                ["Your agreement", "This page explains Audioflume’s standard model. The artist agreement you accept is the source of truth for the exact terms that apply to your catalogue."],
              ].map(([title, copy], index) => (
                <div
                  key={title}
                  className={`grid gap-2 py-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6 ${
                    index < 2 ? "border-b border-[var(--border)]" : ""
                  }`}
                >
                  <div className="text-[12px] font-normal tracking-normal text-[var(--text-primary)]">{title}</div>
                  <p className="m-0 text-[14.5px] font-[300] leading-6 text-[var(--text-secondary)]">{copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16 flex flex-col items-start justify-between gap-6 py-8 sm:flex-row sm:items-center">
            <div>
              <div className="font-[family-name:var(--font-aktiv-grotesk)] text-[24px] font-normal tracking-[-0.035em] text-[var(--text-primary)]">
                Interested in joining the catalogue?
              </div>
              <p className="mb-0 mt-2 max-w-[560px] text-xs leading-5 text-[var(--text-secondary)]">
                Apply for an artist profile and submit your music for review.
              </p>
            </div>
            <Link
              href="/artists/apply"
              className={`${playlistDetailPrimaryActionButtonClass} audioflume-public-action-button hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
            >
              Artist signup
            </Link>
          </section>
        </div>
      </section>

      <section>
        <Footer />
      </section>
    </main>
  );
}
