import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Artist Earnings | Audioflume",
  description:
    "A transparent look at how artists earn through Audioflume subscription, premium licensing, bespoke commissions, and larger licensing opportunities.",
};

const earningModels = [
  {
    number: "01",
    title: "Subscription catalogue",
    split: "Flexible earnings",
    description:
      "The subscription catalogue is the discovery layer of Audioflume. Membership revenue supports the platform and artist payouts, while giving filmmakers broad access to music. Because subscription revenue and catalogue activity change over time, there is no fixed per-download rate. The calculation that applies to your music is set out in the artist agreement before you opt in.",
    example: "Recorded in your dashboard as subscription earnings.",
  },
  {
    number: "02",
    title: "Premium licensing",
    split: "90% artist / 10% Audioflume",
    description:
      "Premium tracks create direct licensing opportunities outside the subscription catalogue. Audioflume handles the licensing transaction as the platform and agent, with 90% of the standard license amount going to the artist and 10% retained by Audioflume.",
    example: "$500 license → $450 artist / $50 Audioflume",
  },
  {
    number: "03",
    title: "Bespoke commissions",
    split: "85% artist / 15% Audioflume",
    description:
      "When a filmmaker or brand needs something made specifically for a project, Audioflume can connect the opportunity with an artist and help manage the commission. The artist receives 85% of the commission amount and Audioflume retains 15%.",
    example: "$2,000 commission → $1,700 artist / $300 Audioflume",
  },
];

export default function ArtistEarningsPage() {
  return (
    <main className="artist-earnings-page-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="px-5 pt-[158px] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[980px]">
          <section className="mb-16 grid gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(280px,1fr)] md:items-end">
            <div>
              <div className="mb-[18px] text-[14.5px] font-[300] uppercase leading-none tracking-[0.04em] text-[var(--text-muted)]">
                Artist earnings
              </div>
              <h1 className="max-w-[440px] font-[family-name:var(--font-aktiv-grotesk)] text-[clamp(42px,6vw,72px)] font-normal leading-[0.9] tracking-[-0.07em] text-[var(--text-primary)]">
                More than one way to earn.
              </h1>
            </div>
            <p className="m-0 max-w-[560px] text-[clamp(16px,1.45vw,20px)] font-[300] leading-[1.35] tracking-normal text-[var(--text-primary)] md:justify-self-end">
              Audioflume combines subscription discovery with direct licensing and custom work. The goal is to make music easy to find without flattening every use into the same royalty rate.
            </p>
          </section>

          <section className="border-t border-[var(--border)]">
            {earningModels.map((model) => (
              <article
                key={model.number}
                className="grid gap-6 border-b border-[var(--border)] py-8 md:grid-cols-[70px_minmax(180px,0.7fr)_minmax(0,1.3fr)] md:gap-8 md:py-10"
              >
                <div className="text-[56px] font-[200] leading-[0.9] text-[var(--bg-tertiary)]">
                  {model.number}
                </div>
                <div>
                  <h2 className="m-0 font-[family-name:var(--font-aktiv-grotesk)] text-[24px] font-normal leading-[1] tracking-[-0.04em] text-[var(--text-primary)]">
                    {model.title}
                  </h2>
                  <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                    {model.split}
                  </div>
                </div>
                <div>
                  <p className="m-0 text-sm leading-6 text-[var(--text-secondary)]">
                    {model.description}
                  </p>
                  <div className="mt-5 border-t border-[var(--border-subtle)] pt-4 font-[family-name:var(--font-roboto-mono)] text-[11px] leading-5 text-[var(--text-primary)]">
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
              <h2 className="m-0 max-w-[300px] font-[family-name:var(--font-aktiv-grotesk)] text-[32px] font-normal leading-[0.96] tracking-[-0.05em] text-[var(--text-primary)]">
                Enterprise licensing is deal-specific.
              </h2>
            </div>
            <div className="max-w-[560px] md:justify-self-end">
              <p className="m-0 text-sm leading-6 text-[var(--text-secondary)]">
                National campaigns, large-scale commercial uses and unusual licensing requests do not always fit a standard rate. When an opportunity falls outside the normal premium structure, the commercial terms are presented before the deal moves forward rather than being hidden behind a generic royalty calculation.
              </p>
            </div>
          </section>

          <section className="grid gap-8 py-12 md:grid-cols-[minmax(200px,0.7fr)_minmax(0,1.3fr)]">
            <div>
              <div className="mb-[18px] text-[14.5px] font-[300] uppercase leading-none tracking-[0.04em] text-[var(--text-muted)]">
                Transparency
              </div>
              <h2 className="m-0 max-w-[320px] font-[family-name:var(--font-aktiv-grotesk)] text-[32px] font-normal leading-[0.96] tracking-[-0.05em] text-[var(--text-primary)]">
                Clear numbers, before and after the license.
              </h2>
            </div>
            <div className="border-t border-[var(--border)] md:border-t-0">
              {[
                ["Before a deal", "The applicable split or commercial terms are made clear before a non-standard opportunity proceeds."],
                ["After a deal", "Recorded earnings are broken out by source in the artist dashboard so subscription, premium, bespoke and other earnings stay identifiable."],
                ["Your agreement", "This page explains Audioflume’s standard model. The artist agreement you accept is the source of truth for the exact terms that apply to your catalogue."],
              ].map(([title, copy]) => (
                <div
                  key={title}
                  className="grid gap-2 border-b border-[var(--border)] py-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6"
                >
                  <div className="text-xs font-normal text-[var(--text-primary)]">{title}</div>
                  <p className="m-0 text-xs leading-5 text-[var(--text-secondary)]">{copy}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16 flex flex-col items-start justify-between gap-6 py-8 sm:flex-row sm:items-center">
            <div>
              <div className="font-[family-name:var(--font-aktiv-grotesk)] text-[24px] font-normal tracking-[-0.04em] text-[var(--text-primary)]">
                Interested in joining the catalogue?
              </div>
              <p className="mb-0 mt-2 max-w-[560px] text-xs leading-5 text-[var(--text-secondary)]">
                Apply for an artist profile and submit your music for review.
              </p>
            </div>
            <Link
              href="/artists/apply"
              className="inline-flex h-10 shrink-0 items-center justify-center border border-[var(--text-primary)] bg-[var(--text-primary)] px-5 text-xs font-medium text-[var(--bg-primary)] transition hover:opacity-80"
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
