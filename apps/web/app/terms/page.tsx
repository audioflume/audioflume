import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | Audioflume",
  description: "Terms for using the Audioflume music and sound-effects platform.",
};

const updated = "November 10, 2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <article className="mx-auto w-full max-w-[820px] px-6 pb-24 pt-28 md:px-10 md:pt-36">
        <p className="mb-5 text-xs text-[var(--text-muted)]">AUDIOFLUME / LEGAL</p>
        <h1 className="mb-5 text-[clamp(36px,5vw,56px)] font-light tracking-[-0.05em]">Terms of Service</h1>
        <p className="mb-10 text-xs text-[var(--text-muted)]">Last updated: {updated}</p>
        <div className="space-y-9 text-sm leading-[1.85] text-[var(--text-secondary)] [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:tracking-[-0.02em] [&_h2]:text-[var(--text-primary)] [&_a]:underline [&_a]:underline-offset-4">
          <p>
            These Terms of Service govern your use of the Audioflume website, accounts, and
            platform features. By using Audioflume, you agree to these terms. If you do not
            agree, please do not use the service.
          </p>
          <section>
            <h2>Using Audioflume</h2>
            <p>
              Audioflume helps users discover, organize, and license music and sound effects.
              You agree to use the service lawfully, provide accurate account information,
              protect your sign-in credentials, and avoid interfering with the platform or
              other users. You are responsible for activities conducted through your account,
              except where applicable law provides otherwise.
            </p>
          </section>
          <section>
            <h2>Accounts and access</h2>
            <p>
              Some features require an account. You must have permission to use any account,
              artist profile, or organization you access. We may restrict or suspend access
              when reasonably necessary to address abuse, security concerns, legal
              requirements, or material violations of these terms.
            </p>
          </section>
          <section>
            <h2>Music, sound effects, and licensing</h2>
            <p>
              Music, sound effects, artwork, and other platform content remain owned by their
              respective rights holders. Browsing, streaming, or downloading a track does not
              transfer copyright ownership. Permission to use music or sound effects in a
              project depends on the specific licence, subscription, or written agreement
              applicable to that content and use.
            </p>
            <p className="mt-3">
              These general website terms do not replace a licence, artist agreement, or
              separately agreed commercial terms. Please review the applicable licensing
              terms before publishing or distributing a project using Audioflume content.
              Artist-facing information is available on our{" "}
              <Link href="/artists/licensing">Licensing &amp; Agreements</Link> page.
            </p>
          </section>
          <section>
            <h2>Subscriptions and payments</h2>
            <p>
              Where paid products or subscriptions are offered, their price, billing cycle,
              included features, and any specific cancellation or refund terms will be
              presented as part of the applicable purchase or plan. Any separately agreed
              order or licensing terms take precedence for that transaction if they conflict
              with these general website terms.
            </p>
          </section>
          <section>
            <h2>Your content</h2>
            <p>
              You retain any rights you hold in information or material you submit. You
              represent that you have the permissions necessary to provide that material.
              You grant Audioflume permission to host, process, display, and otherwise use it
              as reasonably necessary to operate the features you request. Publicly shared
              playlists or artist information may be visible to others.
            </p>
          </section>
          <section>
            <h2>Prohibited activity</h2>
            <p>
              You may not attempt unauthorized access, bypass access or licensing controls,
              scrape or redistribute protected content without permission, upload malicious
              material, impersonate others, or use the service to infringe intellectual
              property or other rights.
            </p>
          </section>
          <section>
            <h2>Availability and responsibility</h2>
            <p>
              We work to keep Audioflume available and accurate, but features, catalogue
              availability, and service performance may change. To the extent permitted by
              applicable law, the service is provided without a guarantee of uninterrupted
              availability, and Audioflume is not responsible for indirect or consequential
              losses arising from its use. Nothing in these terms limits rights or remedies
              that cannot lawfully be excluded.
            </p>
          </section>
          <section>
            <h2>Changes and termination</h2>
            <p>
              We may update these terms or modify the service from time to time. Material
              changes will be communicated as appropriate. You may stop using the service
              at any time, subject to any outstanding subscriptions, licences, or other
              agreements.
            </p>
          </section>
          <section>
            <h2>Contact</h2>
            <p>
              Questions about these terms can be sent to{" "}
              <a href="mailto:audioflume@gmail.com">audioflume@gmail.com</a>.
              For information about personal data, see our{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </section>
        </div>
      </article>
      <Footer />
    </main>
  );
}
