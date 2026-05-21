"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import { usePlayer } from "@/context/PlayerContext";
import { AccountHero, ArrowIcon } from "./AccountUI";
import { heroConfig, navItems } from "./accountData";
import type { AccountSection } from "./accountTypes";
import MembershipSection from "./sections/MembershipSection";
import PaymentSection from "./sections/PaymentSection";
import ProfileSection from "./sections/ProfileSection";
import SecuritySection from "./sections/SecuritySection";
import SettingsSection from "./sections/SettingsSection";
import SupportSection from "./sections/SupportSection";

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
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-[padding-left] duration-200 ease-out md:pl-[var(--sidebar-width,240px)]">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-[var(--border)] bg-[var(--bg-primary)] px-4 pb-24 pt-[88px] lg:sticky lg:top-0 lg:h-screen">
          <div className="mb-6">
            <div className="text-xs font-medium text-[var(--text-muted)]">Account</div>
            <div className="mt-1 text-lg font-medium tracking-[-0.04em] text-[var(--text-primary)]">Filmwave</div>
          </div>

          <nav className="grid gap-0.5" aria-label="Account sections">
            {navItems.map((item) => {
              const active = pathname === item.href || section === item.section;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex min-h-[48px] items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                    active
                      ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">{item.helper}</span>
                  </span>
                  <span className={`text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)] ${active ? "opacity-100" : "opacity-0"}`}>
                    <ArrowIcon />
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 px-5 pt-[88px] md:px-8 xl:px-10">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-8 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div className="text-xs text-[var(--text-muted)]">
                Account / <span className="text-[var(--text-secondary)]">{activeNav?.label || "Account"}</span>
              </div>
              <Link
                href="/music"
                className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
