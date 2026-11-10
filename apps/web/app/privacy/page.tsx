import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Audioflume",
  description: "How Audioflume collects, uses, and protects personal information.",
};

const updated = "November 10, 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <article className="mx-auto w-full max-w-[820px] px-6 pb-24 pt-28 md:px-10 md:pt-36">
        <p className="mb-5 text-xs text-[var(--text-muted)]">AUDIOFLUME / LEGAL</p>
        <h1 className="mb-5 text-[clamp(36px,5vw,56px)] font-light tracking-[-0.05em]">Privacy Policy</h1>
        <p className="mb-10 text-xs text-[var(--text-muted)]">Last updated: {updated}</p>
        <div className="space-y-9 text-sm leading-[1.85] text-[var(--text-secondary)] [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:tracking-[-0.02em] [&_h2]:text-[var(--text-primary)] [&_a]:underline [&_a]:underline-offset-4">
          <p>
            Audioflume is a platform for discovering, organizing, and licensing music and sound
            effects. This policy describes how we handle personal information when you use
            audioflume.com, create an account, or contact us.
          </p>
          <section>
            <h2>Information we collect</h2>
            <p>
              We may collect information you provide, such as your name, email address, account
              details, artist application and profile information, support messages, projects,
              playlists, favorites, and licensing-related information. When you use the service,
              we may also process technical information such as your IP address, browser type,
              device details, authentication activity, and usage or diagnostic data.
            </p>
          </section>
          <section>
            <h2>Google sign-in</h2>
            <p>
              If you choose Continue with Google, Google provides the identity details necessary
              to sign you in, such as your Google account identifier, name, email address, and
              profile picture, depending on the information available and your Google settings.
              We use this information to authenticate you, create or manage your Audioflume
              account, and display your account identity. Google sign-in does not give
              Audioflume access to your Gmail messages, Google Drive files, or contacts.
            </p>
          </section>
          <section>
            <h2>How we use information</h2>
            <p>
              We use personal information to operate and secure accounts, deliver music discovery
              and licensing features, save your preferences and projects, manage artist
              relationships, respond to requests, process transactions when applicable, prevent
              abuse, and improve the reliability of the service.
            </p>
          </section>
          <section>
            <h2>Service providers and sharing</h2>
            <p>
              We use third-party infrastructure and service providers to support authentication,
              data storage, hosting, content delivery, and other platform operations. These
              providers may process relevant information on our behalf. We may also disclose
              information when required by law, to protect rights or safety, or as part of a
              legitimate business transfer. Information you choose to publish in an artist or
              public profile may be visible to other visitors.
            </p>
          </section>
          <section>
            <h2>Cookies and local storage</h2>
            <p>
              Audioflume and its authentication providers use cookies or similar browser storage
              to maintain sessions, remember preferences, and support core website functionality.
              Browser settings may let you restrict storage, although doing so can affect sign-in
              and other features.
            </p>
          </section>
          <section>
            <h2>Storage, security, and retention</h2>
            <p>
              We use technical and organizational measures intended to protect personal
              information. No online system can guarantee absolute security. We retain
              information for as long as reasonably necessary to provide the service, meet legal
              obligations, resolve disputes, and protect the platform. Service providers may
              store or process information outside your province or country.
            </p>
          </section>
          <section>
            <h2>Your choices and rights</h2>
            <p>
              You can update certain account information in the website. You may contact us to
              request access to, correction of, or deletion of personal information, subject to
              applicable legal and operational requirements. You may also stop using Google
              sign-in or withdraw applicable permissions through your Google account settings,
              but doing so can affect account access.
            </p>
          </section>
          <section>
            <h2>Changes to this policy</h2>
            <p>
              We may update this policy as our services or legal requirements change. The date
              above indicates when this version was last updated.
            </p>
          </section>
          <section>
            <h2>Contact</h2>
            <p>
              For privacy questions or requests, email{" "}
              <a href="mailto:audioflume@gmail.com">audioflume@gmail.com</a>.
              You can also review our <Link href="/terms">Terms of Service</Link>.
            </p>
          </section>
        </div>
      </article>
      <Footer />
    </main>
  );
}
