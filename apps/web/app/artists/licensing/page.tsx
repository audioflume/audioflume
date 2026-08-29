import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";
import { playlistDetailPrimaryActionButtonClass } from "@/components/uiClasses";

export const metadata: Metadata = {
  title: "Licensing & Agreements | Audioflume",
  description:
    "An overview of how Audioflume approaches artist licensing, custom opportunities, and artist agreements.",
};

const licensingModels = [
  {
    number: "01",
    title: "Subscription licensing",
    label: "Catalogue Access",
    description:
      "Music included in the subscription catalogue is made available to filmmakers through Audioflume’s platform licensing structure. The artist agreement sets out the terms that apply to catalogue participation before music is included, so artists can understand the relationship before opting in.",
    note: "Your artist agreement is the source of truth for catalogue participation.",
  },
  {
    number: "02",
    title: "Premium licensing",
    label: "Direct Licensing",
    description:
      "Premium tracks create direct licensing opportunities outside the subscription catalogue. Standard licenses can be handled through Audioflume, while larger campaigns, unusual uses, or opportunities that fall outside the normal structure are presented with their commercial terms before the license moves forward.",
    note: "Non-standard commercial terms are agreed before the license proceeds.",
  },
  {
    number: "03",
    title: "Bespoke commissions",
    label: "Custom Work",
    description:
      "When a filmmaker or brand needs original music for a specific project, Audioflume can connect the opportunity with an artist and help facilitate the commission. Scope, fee, usage, and any project-specific terms are established for that opportunity rather than being folded into a generic catalogue license.",
    note: "Custom scope. Clear usage. Terms established for the project.",
  },
];

export default function ArtistLicensingPage() {
  return (
    <main className="artist-earnings-page-root artist-licensing-page-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="px-5 pt-[158px] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[980px]">
          <section className="mb-16 grid gap-8 md:grid-cols-[70px_minmax(180px,0.7fr)_minmax(0,1.3fr)] md:items-end">
            <div className="md:col-span-2">
              <div className="mb-[18px] text-[14.5px] font-[300] uppercase leading-none tracking-[0.04em] text-[var(--text-muted)]">
                Licensing & agreements
              </div>
              <h1 className="font-[family-name:var(--font-aktiv-grotesk)] text-[clamp(42px,5vw,60px)] font-normal leading-[0.9] tracking-[-0.035em] text-[var(--text-primary)]">
                Clear terms from the start.
              </h1>
            </div>
            <p className="m-0 text-[clamp(16px,1.45vw,20px)] font-[300] leading-[1.35] tracking-normal text-[var(--text-primary)]">
              Audioflume is built to make music straightforward to license while keeping artists clear on how their work can be used, how opportunities are handled, and which terms apply.
            </p>
          </section>

          <section className="border-t border-[var(--border)]">
            {licensingModels.map((model) => (
              <article
                key={model.number}
                className="grid gap-6 border-b border-[var(--border)] py-8 md:grid-cols-[70px_minmax(180px,0.7fr)_minmax(0,1.3fr)] md:gap-8 md:py-10"
              >
                <div className="grid w-[70px] self-start place-items-center bg-[color-mix(in_srgb,var(--text-primary)_10%,var(--bg-primary))] py-[4px] text-center text-[56px] font-[200] leading-none text-[var(--filmwave-white)]">
                  {model.number}
                </div>
                <div>
                  <h2 className="m-0 font-[family-name:var(--font-aktiv-grotesk)] text-[24px] font-normal leading-[1] tracking-[-0.035em] text-[var(--text-primary)]">
                    {model.title}
                  </h2>
                  <div className="mt-3 text-[12px] font-normal tracking-normal text-[var(--text-secondary)]">
                    {model.label}
                  </div>
                </div>
                <div>
                  <p className="m-0 text-[14.5px] font-[300] leading-6 text-[var(--text-secondary)]">
                    {model.description}
                  </p>
                  <div className="mt-5 pt-4 font-[family-name:var(--font-roboto-mono)] text-[12px] leading-5 text-[var(--text-primary)]">
                    {model.note}
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="grid gap-8 border-b border-[var(--border)] py-12 md:grid-cols-[minmax(200px,0.7fr)_minmax(0,1.3fr)]">
            <div>
              <div className="mb-[18px] text-[14.5px] font-[300] uppercase leading-none tracking-[0.04em] text-[var(--text-muted)]">
                Artist agreements
              </div>
              <h2 className="m-0 max-w-[320px] font-[family-name:var(--font-aktiv-grotesk)] text-[32px] font-normal leading-[0.96] tracking-[-0.035em] text-[var(--text-primary)]">
                Accepted against the exact version.
              </h2>
            </div>
            <div className="w-full max-w-[560px] border-t border-[var(--border)] md:justify-self-end md:border-t-0">
              {[
                ["Published documents", "Required agreements and onboarding documents are presented in the artist dashboard when they are ready for review."],
                ["Owner approval", "Only the artist owner can accept agreements on behalf of the artist."],
                ["Recorded acceptance", "Acceptance is recorded against the specific document version, along with when it was accepted and who accepted it."],
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

          <section className="grid gap-8 border-b border-[var(--border)] py-12 md:grid-cols-[minmax(200px,0.7fr)_minmax(0,1.3fr)]">
            <div>
              <div className="mb-[18px] text-[14.5px] font-[300] uppercase leading-none tracking-[0.04em] text-[var(--text-muted)]">
                Source of truth
              </div>
              <h2 className="m-0 max-w-[320px] font-[family-name:var(--font-aktiv-grotesk)] text-[32px] font-normal leading-[0.96] tracking-[-0.035em] text-[var(--text-primary)]">
                The agreement defines the relationship.
              </h2>
            </div>
            <div className="max-w-[560px] md:justify-self-end">
              <p className="m-0 text-[14.5px] font-[300] leading-6 text-[var(--text-secondary)]">
                This page is an overview of how Audioflume approaches licensing and artist agreements. The actual document presented to an artist is the source of truth for the rights, responsibilities, participation terms, and commercial details that apply to that artist and catalogue.
              </p>
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
              Artist applications
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
