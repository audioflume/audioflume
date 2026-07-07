"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import { usePlayer } from "@/context/PlayerContext";
import { AccountHero } from "./AccountUI";
import { heroConfig, navItems } from "./accountData";
import type { AccountSection } from "./accountTypes";
import MembershipSection from "./sections/MembershipSection";
import PaymentSection from "./sections/PaymentSection";
import ProfileSection from "./sections/ProfileSection";
import SecuritySection from "./sections/SecuritySection";
import SettingsSection from "./sections/SettingsSection";
import SupportSection from "./sections/SupportSection";
import { SettingsSideNav } from "@filmwave/shared";

type AccountSettingsShellProps = {
  section: AccountSection;
};

function AccountContent({ section }: { section: AccountSection }) {
  if (section === "profile") return <ProfileSection />;
  if (section === "settings") return <SettingsSection />;
  if (section === "membership") return <MembershipSection />;
  if (section === "payment") return <PaymentSection />;
  if (section === "security") return <SecuritySection />;
  return <SupportSection />;
}

export default function AccountSettingsShell({ section }: AccountSettingsShellProps) {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const activeNav = navItems.find((item) => item.section === section);
  const currentHero = heroConfig[section];
  const hasPlayer = Boolean(currentSong);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <style>{`
        .account-content-area {
          background: color-mix(in srgb, var(--bg-primary) 96%, var(--text-primary) 4%);
        }

        :where(html.dark, html[data-theme="dark"]) .account-content-area {
          background: var(--bg-primary);
        }
      `}</style>

      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <SettingsSideNav
          kicker="Account"
          title="Filmwave"
          ariaLabel="Account sections"
          linkComponent={Link}
          className="lg:sticky lg:top-0 lg:h-screen"
          items={navItems.map((item) => ({
            label: item.label,
            helper: item.helper,
            href: item.href,
            active: pathname === item.href || section === item.section,
          }))}
        />

        <section className="account-content-area min-w-0 px-5 pt-[88px] md:px-8 xl:px-10">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-8 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div className="text-xs text-[var(--text-muted)]">
                Account / <span className="text-[var(--text-secondary)]">{activeNav?.label || "Account"}</span>
              </div>
              <Link
                href="/music"
                className="inline-flex h-8 items-center justify-center border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Back to music
              </Link>
            </div>

            <AccountHero config={currentHero} />
            <AccountContent section={section} />

            <div className="mt-16 border-t border-[var(--border)] pt-8" style={{ paddingBottom: hasPlayer ? "72px" : "8px" }}>
              <Footer />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
